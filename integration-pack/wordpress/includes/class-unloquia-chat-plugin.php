<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Unloquia_Chat_Plugin {

 const POLL_INTERVAL_MS = 2000;

	const OPTION_GROUP = 'unloquia_chat';
	const OPTION_KEY   = 'unloquia_chat_settings';

	public function run() {
		add_action( 'admin_menu', array( $this, 'register_settings_page' ) );
		add_action( 'admin_init', array( $this, 'register_settings' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_assets' ) );
		add_action( 'wp_footer', array( $this, 'render_mount_node' ) );
		add_action( 'rest_api_init', array( $this, 'register_rest_routes' ) );
	}

	public function register_settings_page() {
		add_options_page(
			'Unloquia Chat',
			'Unloquia Chat',
			'manage_options',
			'unloquia-chat',
			array( $this, 'render_settings_page' )
		);
	}

	public function register_settings() {
		register_setting(
			self::OPTION_GROUP,
			self::OPTION_KEY,
			array( $this, 'sanitize_settings' )
		);

		add_settings_section(
			'unloquia_chat_section_main',
			__( 'Widget Configuration', 'unloquia-chat' ),
			function () {
				echo '<p>' . esc_html__( 'Provide your Unloquia credentials. Find the values in Supabase → messaging_channel_configs.', 'unloquia-chat' ) . '</p>';
			},
			'unloquia-chat'
		);

		add_settings_field(
			'client_id',
			__( 'Client ID (UUID)', 'unloquia-chat' ),
			array( $this, 'render_input' ),
			'unloquia-chat',
			'unloquia_chat_section_main',
			array(
				'label_for'   => 'unloquia_chat_client_id',
				'option_key'  => 'client_id',
				'placeholder' => '8a8c9728-e5f5-459e-a1f7-2016bd091bd4',
			)
		);

		add_settings_field(
			'landing_secret',
			__( 'Landing Ingest Secret', 'unloquia-chat' ),
			array( $this, 'render_input' ),
			'unloquia-chat',
			'unloquia_chat_section_main',
			array(
				'label_for'   => 'unloquia_chat_landing_secret',
				'option_key'  => 'landing_secret',
				'type'        => 'password',
				'placeholder' => 'aYZKligwkD0eLw3gaFUWDjvJvSfAZon1',
			)
		);

		add_settings_field(
			'api_base',
			__( 'API Base (optional)', 'unloquia-chat' ),
			array( $this, 'render_input' ),
			'unloquia-chat',
			'unloquia_chat_section_main',
			array(
				'label_for'   => 'unloquia_chat_api_base',
				'option_key'  => 'api_base',
				'placeholder' => 'https://api.unloquia.com',
			)
		);
	}

	public function sanitize_settings( $input ) {
		$sanitized = array();
		$sanitized['client_id']      = isset( $input['client_id'] ) ? sanitize_text_field( wp_unslash( $input['client_id'] ) ) : '';
		$sanitized['landing_secret'] = isset( $input['landing_secret'] ) ? sanitize_text_field( wp_unslash( $input['landing_secret'] ) ) : '';
		$sanitized['api_base']       = isset( $input['api_base'] ) ? esc_url_raw( $input['api_base'] ) : '';

		return $sanitized;
	}

	public function render_input( $args ) {
		$options     = get_option( self::OPTION_KEY, array() );
		$option_key  = $args['option_key'];
		$value       = isset( $options[ $option_key ] ) ? $options[ $option_key ] : '';
		$type        = isset( $args['type'] ) ? $args['type'] : 'text';
		$placeholder = isset( $args['placeholder'] ) ? $args['placeholder'] : '';

		printf(
			'<input type="%1$s" id="%2$s" name="%3$s[%4$s]" value="%5$s" class="regular-text" placeholder="%6$s"/>',
			esc_attr( $type ),
			esc_attr( $args['label_for'] ),
			esc_attr( self::OPTION_KEY ),
			esc_attr( $option_key ),
			esc_attr( $value ),
			esc_attr( $placeholder )
		);
	}

	public function render_settings_page() {
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'Unloquia Chat Widget', 'unloquia-chat' ); ?></h1>
			<form method="post" action="options.php">
				<?php
				settings_fields( self::OPTION_GROUP );
				do_settings_sections( 'unloquia-chat' );
				submit_button();
				?>
			</form>
		</div>
		<?php
	}

	public function enqueue_assets() {
		if ( is_admin() ) {
			return;
		}

		$options    = get_option( self::OPTION_KEY, array() );
		$client_id  = isset( $options['client_id'] ) ? trim( $options['client_id'] ) : '';
		$api_base   = isset( $options['api_base'] ) && $options['api_base'] ? trailingslashit( $options['api_base'] ) : 'https://api.unloquia.com/';

		if ( empty( $client_id ) ) {
			return;
		}

		wp_enqueue_style(
			'unloquia-chat-widget',
			UNLOQUIA_CHAT_URL . 'assets/unloquia-chat-widget.css',
			array(),
			UNLOQUIA_CHAT_VERSION
		);

		wp_enqueue_script(
			'unloquia-chat-widget',
			UNLOQUIA_CHAT_URL . 'assets/unloquia-chat-widget.js',
			array(),
			UNLOQUIA_CHAT_VERSION,
			true
		);

		wp_localize_script(
			'unloquia-chat-widget',
			'UnloquiaChatConfig',
			array(
				'clientId'  => $client_id,
                'pollMs'    => self::POLL_INTERVAL_MS,
				'apiBase'   => rest_url( 'unloquia/v1/' ),
				'directApi' => $api_base,
			)
		);
	}

	public function render_mount_node() {
		$options   = get_option( self::OPTION_KEY, array() );
		$client_id = isset( $options['client_id'] ) ? trim( $options['client_id'] ) : '';

		if ( empty( $client_id ) ) {
			return;
		}

		echo '<div id="unloquia-chat-root" data-unloquia-ready="1"></div>';
	}

	public function register_rest_routes() {
		register_rest_route(
			'unloquia/v1',
			'/messages',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'handle_messages' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'clientId' => array(
						'required'          => true,
						'sanitize_callback' => 'sanitize_text_field',
					),
					'sessionId' => array(
						'required'          => true,
						'sanitize_callback' => 'sanitize_text_field',
					),
					'since' => array(
						'required'          => false,
						'sanitize_callback' => 'sanitize_text_field',
					),
					'limit' => array(
						'required'          => false,
						'sanitize_callback' => 'absint',
					),
				),
			)
		);

		register_rest_route(
			'unloquia/v1',
			'/proxy',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'handle_proxy' ),
				'permission_callback' => '__return_true',
			)
		);
	}

	public function handle_messages( WP_REST_Request $request ) {
		$options = get_option( self::OPTION_KEY, array() );
		$secret  = isset( $options['landing_secret'] ) ? trim( $options['landing_secret'] ) : '';

		if ( empty( $secret ) ) {
			return new WP_REST_Response(
				array( 'error' => 'Landing secret not configured.' ),
				500
			);
		}

		$api_base = isset( $options['api_base'] ) && $options['api_base'] ? trailingslashit( $options['api_base'] ) : 'https://api.unloquia.com/';

		$url = add_query_arg(
			array(
				'client_id'  => $request->get_param( 'clientId' ),
				'session_id' => $request->get_param( 'sessionId' ),
				'since'      => $request->get_param( 'since' ),
				'limit'      => $request->get_param( 'limit' ) ?: 200,
			),
			$api_base . 'api/v1/landing/messages/'
		);

		$response = wp_remote_get(
			$url,
			array(
				'headers' => array(
					'X-Landing-Secret' => $secret,
				),
				'timeout' => 15,
			)
		);

		if ( is_wp_error( $response ) ) {
			return new WP_REST_Response(
				array( 'error' => $response->get_error_message() ),
				502
			);
		}

		$status = wp_remote_retrieve_response_code( $response );
		$body   = wp_remote_retrieve_body( $response );

		if ( 404 === $status ) {
			return new WP_REST_Response( array( 'messages' => array() ), 200 );
		}

		$json = json_decode( $body, true );

		return new WP_REST_Response( $json, $status );
	}

	public function handle_proxy( WP_REST_Request $request ) {
		$options = get_option( self::OPTION_KEY, array() );
		$secret  = isset( $options['landing_secret'] ) ? trim( $options['landing_secret'] ) : '';

		if ( empty( $secret ) ) {
			return new WP_REST_Response(
				array( 'error' => 'Landing secret not configured.' ),
			 500
			);
		}

		$body = json_decode( $request->get_body(), true );
		if ( ! is_array( $body ) ) {
			return new WP_REST_Response(
				array( 'error' => 'Invalid JSON payload.' ),
				400
			);
		}

		$missing = array();
		foreach ( array( 'clientId', 'messageId', 'userId', 'text' ) as $key ) {
			if ( empty( $body[ $key ] ) ) {
				$missing[] = $key;
			}
		}

		if ( ! empty( $missing ) ) {
			return new WP_REST_Response(
				array(
					'error'   => 'Missing required fields.',
					'missing' => $missing,
				),
				400
			);
		}

		$api_base = isset( $options['api_base'] ) && $options['api_base'] ? trailingslashit( $options['api_base'] ) : 'https://api.unloquia.com/';

		$payload = array(
			'client_id' => $body['clientId'],
			'channel'   => 'landing',
			'message'   => array(
				'message_id' => $body['messageId'],
				'direction'  => 'inbound',
				'type'       => 'text',
				'timestamp'  => gmdate( 'c' ),
				'contact'    => array(
					'wa_id'       => $body['userId'],
					'profile_name'=> $body['userId'],
				),
				'content'    => array(
					'text' => $body['text'],
				),
				'attributes' => array(
					'source' => 'landing-widget',
				),
			),
			'context' => array(
				'variables' => array(
					'landing_user_id'   => $body['userId'],
					'landing_message_id'=> $body['messageId'],
				),
				'tenant_scopes' => array(),
			),
			'trace' => array(
				'source' => 'landing-widget',
			),
		);

		$response = wp_remote_post(
			$api_base . 'api/v1/workflows/execute/',
			array(
				'headers' => array(
					'Content-Type'     => 'application/json',
					'X-Landing-Secret' => $secret,
				),
				'body'    => wp_json_encode( $payload ),
				'timeout' => 15,
			)
		);

		if ( is_wp_error( $response ) ) {
			return new WP_REST_Response(
				array( 'error' => $response->get_error_message() ),
				502
			);
		}

		$status = wp_remote_retrieve_response_code( $response );
		$body   = wp_remote_retrieve_body( $response );
		$json   = json_decode( $body, true );

		return new WP_REST_Response( $json, $status );
	}
}

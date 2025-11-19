<?php
/**
 * Plugin Name: Unloquia Chat Widget
 * Description: Floating chat widget that connects to the Unloquia landing channel (Supabase + Django backend).
 * Version:     1.0.0
 * Author:      Unloquia
 * License:     GPL-2.0-or-later
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'UNLOQUIA_CHAT_VERSION', '1.0.0' );
define( 'UNLOQUIA_CHAT_FILE', __FILE__ );
define( 'UNLOQUIA_CHAT_DIR', plugin_dir_path( __FILE__ ) );
define( 'UNLOQUIA_CHAT_URL', plugin_dir_url( __FILE__ ) );

require_once UNLOQUIA_CHAT_DIR . 'includes/class-unloquia-chat-plugin.php';

function unloquia_chat_run() {
	$plugin = new Unloquia_Chat_Plugin();
	$plugin->run();
}
unloquia_chat_run();

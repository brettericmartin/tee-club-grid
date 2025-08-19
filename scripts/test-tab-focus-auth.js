#!/usr/bin/env node

/**
 * Test script to verify tab focus authentication is working
 * Run this in the browser console to test tab focus handling
 */

console.log(`
===================================
TAB FOCUS AUTH TEST SUITE
===================================

This script tests the tab focus authentication functionality.
It will simulate various tab visibility scenarios.

Available commands:
- tabFocusAuth.status() - Check current tab status
- tabFocusAuth.check() - Manual focus check  
- tabFocusAuth.refresh() - Force refresh
- authDebug.checkSession() - Check session status
- authDebug.showLogs() - Show auth logs

To test:
1. Open browser console (F12)
2. Switch to another tab for 10+ seconds
3. Return to this tab
4. Check console for auth refresh messages

Enhanced testing:
- Try switching tabs multiple times
- Leave tab hidden for 1+ minutes
- Check session persistence

The following should happen automatically:
✅ Session check when returning to tab
✅ Token refresh if needed
✅ No auth loss during tab switches
✅ Maintained data loading

===================================
`);

// Export test functions for browser console
if (typeof window !== 'undefined') {
  window.testTabFocus = {
    // Simulate tab becoming hidden
    simulateHidden: () => {
      console.log('🔴 Simulating tab hidden...');
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('blur'));
    },
    
    // Simulate tab becoming visible
    simulateVisible: () => {
      console.log('🟢 Simulating tab visible...');
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
    },
    
    // Run full test sequence
    runFullTest: async () => {
      console.log('Starting full tab focus test sequence...');
      
      // Check initial status
      console.log('1. Initial status:');
      if (window.tabFocusAuth) {
        console.log(window.tabFocusAuth.status());
      }
      
      // Simulate hiding tab
      console.log('\n2. Hiding tab...');
      window.testTabFocus.simulateHidden();
      
      // Wait 3 seconds
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Simulate showing tab
      console.log('\n3. Showing tab...');
      window.testTabFocus.simulateVisible();
      
      // Check final status
      setTimeout(() => {
        console.log('\n4. Final status:');
        if (window.tabFocusAuth) {
          console.log(window.tabFocusAuth.status());
        }
        if (window.authDebug) {
          window.authDebug.checkSession();
        }
      }, 1000);
    },
    
    // Monitor tab changes in real-time
    startMonitoring: () => {
      console.log('📊 Starting real-time tab monitoring...');
      
      const interval = setInterval(() => {
        if (window.tabFocusAuth) {
          const status = window.tabFocusAuth.status();
          console.log(`[Monitor] Visible: ${status.isVisible}, Last Change: ${new Date(status.lastChange).toLocaleTimeString()}`);
        }
      }, 5000);
      
      // Return stop function
      return () => {
        clearInterval(interval);
        console.log('Monitoring stopped');
      };
    }
  };
  
  console.log(`
Test commands loaded! Try:
- testTabFocus.runFullTest() - Run automated test
- testTabFocus.startMonitoring() - Start real-time monitoring
- testTabFocus.simulateHidden() - Simulate tab hidden
- testTabFocus.simulateVisible() - Simulate tab visible
`);
}
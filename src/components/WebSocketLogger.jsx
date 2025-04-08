import React, { useEffect } from 'react';
import websocketService from '../services/websocketService';

/**
 * A component that simply logs WebSocket messages to the console.
 * This component doesn't render anything visible, it just attaches
 * event listeners to the WebSocket service.
 * 
 * @param {Object} props - Component props
 * @param {string} props.testRunId - Optional test run ID to connect to
 */
const WebSocketLogger = ({ testRunId }) => {
  useEffect(() => {
    if (!testRunId) return;
    
    // Create handlers just for logging
    const handlers = {
      'adapter_setup': (data) => {
        console.log('%c[WebSocket] ADAPTER SETUP', 'color: cyan; font-weight: bold; font-size: 14px', {
          message: data.message,
          timestamp: data.timestamp
        });
      },
      'diagnostic': (data) => {
        console.log('%c[WebSocket] DIAGNOSTIC MESSAGE', 'color: magenta; font-weight: bold; font-size: 14px', {
          message: data.message,
          timestamp: data.timestamp
        });
      },
      'model_input': (data) => {
        console.log('%c[WebSocket] MODEL INPUT', 'color: green; font-weight: bold', {
          test_id: data.test_id,
          prompt_type: data.prompt_type,
          prompt: data.prompt,
          timestamp: data.timestamp
        });
      },
      'model_output': (data) => {
        console.log('%c[WebSocket] MODEL OUTPUT', 'color: blue; font-weight: bold', {
          test_id: data.test_id,
          output: data.output,
          timestamp: data.timestamp
        });
      },
      'evaluation_result': (data) => {
        console.log('%c[WebSocket] EVALUATION RESULT', 'color: purple; font-weight: bold', {
          test_id: data.test_id,
          evaluation: data.evaluation,
          timestamp: data.timestamp
        });
      },
      'issue_found': (data) => {
        console.log('%c[WebSocket] ISSUE FOUND', 'color: red; font-weight: bold', {
          test_id: data.test_id,
          issue_type: data.issue_type,
          details: data.details,
          timestamp: data.timestamp
        });
      },
      'test_status_update': (data) => {
        console.log('%c[WebSocket] TEST STATUS UPDATE', 'color: orange; font-weight: bold', data);
      },
      'test_progress': (data) => {
        console.log('%c[WebSocket] TEST PROGRESS', 'color: teal; font-weight: bold', data);
      },
      'test_complete': (data) => {
        console.log('%c[WebSocket] TEST COMPLETE', 'color: green; font-weight: bold', data);
      },
      'test_failed': (data) => {
        console.log('%c[WebSocket] TEST FAILED', 'color: red; font-weight: bold', data);
      },
      'message': (data) => {
        console.log('[WebSocket] Generic Message:', data);
      }
    };
    
    // Register handlers
    const removers = [];
    Object.entries(handlers).forEach(([event, handler]) => {
      const remover = websocketService.on(event, handler);
      removers.push(remover);
    });
    
    console.log(`WebSocketLogger initialized for test run ${testRunId}`);
    
    // Clean up handlers on unmount
    return () => {
      removers.forEach(remove => remove());
      console.log('WebSocketLogger cleanup');
    };
  }, [testRunId]);
  
  // This component doesn't render anything
  return null;
};

export default WebSocketLogger; 

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { SystemErrorBoundary, ApiKeyGuard } from './components/SystemGuard';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <SystemErrorBoundary>
      <ApiKeyGuard>
        <App />
      </ApiKeyGuard>
    </SystemErrorBoundary>
  </React.StrictMode>
);

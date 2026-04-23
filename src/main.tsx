import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './app/App';
import { createWallet } from './pureLogic/wallet';

// P23 boot order: hydrate the P08 wallet from localStorage before mounting the
// React tree so every component sees a fully-populated store on first render.
const wallet = createWallet();

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found in index.html');
}

createRoot(rootEl).render(
  <StrictMode>
    <App wallet={wallet} />
  </StrictMode>,
);

// Entry point — bootstraps the app: loads data, then renders <App/>.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App, loadAll } from './app.jsx';
import './styles.css';

loadAll()
  .then((data) => {
    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <App data={data} />
      </React.StrictMode>
    );
  })
  .catch((err) => {
    // Error path uses DOM APIs, not innerHTML — err.message is untrusted in principle.
    const root = document.getElementById('root');
    root.textContent = '';
    const wrap = document.createElement('div');
    wrap.style.cssText = 'padding:40px;font-family:system-ui;color:#9b2226';
    const h2 = document.createElement('h2');
    h2.textContent = 'Failed to load data';
    const pre = document.createElement('pre');
    pre.textContent = err.message;
    wrap.appendChild(h2);
    wrap.appendChild(pre);
    root.appendChild(wrap);
  });

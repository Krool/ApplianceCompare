// Entry point — bootstraps the app: loads data, then renders <App/>.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App, loadAll } from './app.jsx';
import './styles.css';

function start() {
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
      wrap.style.cssText = 'padding:40px;font-family:system-ui;color:#1a1814;max-width:560px';
      const h2 = document.createElement('h2');
      h2.textContent = 'The appliance data didn’t load';
      const p = document.createElement('p');
      p.textContent = 'This is usually a brief network problem. Try again; if it keeps happening, the details below help us fix it.';
      const btn = document.createElement('button');
      btn.textContent = 'Try again';
      btn.style.cssText = 'padding:8px 16px;font:inherit;cursor:pointer';
      btn.addEventListener('click', () => { root.textContent = 'Loading…'; start(); });
      const pre = document.createElement('pre');
      pre.style.cssText = 'color:#6b6557;font-size:12px;white-space:pre-wrap';
      pre.textContent = err.message;
      wrap.append(h2, p, btn, pre);
      root.appendChild(wrap);
    });
}

start();

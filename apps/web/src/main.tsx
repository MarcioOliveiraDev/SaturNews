import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { ErroApi } from './api/cliente';
import { App } from './App';
import './estilos/index.css';

const cliente = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      // Não insiste em erros de autorização/validação, só em falhas de rede/servidor.
      retry: (falhas, erro) => falhas < 2 && (!(erro instanceof ErroApi) || erro.status === 0 || erro.status >= 500),
    },
  },
});

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <QueryClientProvider client={cliente}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);

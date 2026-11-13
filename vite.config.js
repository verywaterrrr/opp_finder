import {defineConfig} from 'vite';
export default defineConfig({base:process.env.VITE_PUBLIC_MODE==='true'?'/opp_finder/':'/',server:{port:5174,proxy:{'/api':'http://127.0.0.1:5173'}}});

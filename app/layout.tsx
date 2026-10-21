import type { Metadata } from 'next';
import './globals.css';
import './dark-theme.css';
import { THEME_STORAGE_KEY } from '@/lib/theme';
export const metadata:Metadata={title:'Grimorio · Tu biblioteca de personajes',description:'Crea, descubre y vive tus personajes. Un grimorio personal de D&D 5e basado en Manual para Casi Todo.',icons:{icon:'/favicon.svg'}};
const themeScript = `try{document.documentElement.dataset.theme=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})==='dark'?'dark':'light'}catch{document.documentElement.dataset.theme='light'}`;
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="es" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:themeScript}}/></head><body>{children}</body></html>}

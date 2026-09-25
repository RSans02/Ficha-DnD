import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Grimorio · Tu biblioteca de personajes',description:'Crea, descubre y vive tus personajes. Un grimorio personal de D&D 5e basado en Manual para Casi Todo.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="es"><body>{children}</body></html>}

import './globals.css'

export const metadata = {
  title: 'CSV Planet Classifier',
  description: 'Upload, edit and classify CSV data',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
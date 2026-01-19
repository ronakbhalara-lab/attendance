import "./globals.css";

export const metadata = {
  title: "Attendance System",
  description: "Next.js Attendance System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-100">
        {children}
      </body>
    </html>
  );
}

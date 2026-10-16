import type { Metadata } from "next";
import "./globals.css";
import "./editorial.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://issuescout-lake.vercel.app"),
  title: "IssueScout — Find the signal",
  description: "Understand GitHub issues with a researched first pass. Review context, missing details, and suggested next steps with IssueScout.",
  openGraph: {
    type: "website",
    siteName: "IssueScout",
    title: "IssueScout — GitHub issues. A clearer next step.",
    description: "A researched first pass with supporting evidence, an assessment, and next steps for maintainers.",
  },
  twitter: {
    card: "summary_large_image",
    title: "IssueScout — GitHub issues. A clearer next step.",
    description: "Supporting evidence, an assessment, and next steps for maintainers.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

import SiteDetailClient from "@/components/sites/site-detail-client";

// Required for static export with dynamic routes
export async function generateStaticParams() {
    return [{ id: "default" }];
}

export default function SiteDetailPage() {
    return <SiteDetailClient />;
}

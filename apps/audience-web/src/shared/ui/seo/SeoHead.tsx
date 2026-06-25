import { Helmet } from 'react-helmet-async';

export interface SeoHeadProps {
  title: string;
  description?: string;
  imageUrl?: string;
  url?: string;
  type?: string;
}

export function SeoHead({
  title,
  description = 'Ticketbox - Discover Events',
  imageUrl,
  url,
  type = 'website',
}: SeoHeadProps) {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      {url && <meta property="og:url" content={url} />}
      {imageUrl && <meta property="og:image" content={imageUrl} />}

      <meta name="twitter:card" content={imageUrl ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {imageUrl && <meta name="twitter:image" content={imageUrl} />}
    </Helmet>
  );
}

import { unified } from '@astrojs/markdown-remark'
import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'
import remarkGfm from 'remark-gfm'
import rehypeMermaid from 'rehype-mermaid'

export default defineConfig({
  site: 'https://mrbro.dev',
  base: '/dev-like',
  trailingSlash: 'always',
  markdown: {
    processor: unified({
      remarkPlugins: [remarkGfm],
      rehypePlugins: [
        [
          rehypeMermaid,
          {
            strategy: 'inline-svg',
            mermaidConfig: {
              theme: 'base',
              themeVariables: {
                primaryColor: 'var(--sl-color-bg)',
                primaryTextColor: 'var(--sl-color-text)',
                primaryBorderColor: 'var(--accent-highlighter)',
                lineColor: 'var(--accent-highlighter)',
                secondaryColor: 'var(--sl-color-bg-nav)',
                tertiaryColor: 'var(--sl-color-bg-inline-code)',
              },
            },
          },
        ],
      ],
    }),
  },
  integrations: [
    starlight({
      title: 'dev-like',
      favicon: '/favicon.svg',
      components: {
        Header: './src/components/Header.astro',
      },
      customCss: ['./src/styles/custom.css'],
      description:
        "Profile a shop's engineering culture from public sources and install develop-like-<target> agent skills, with receipts.",
      head: [
        {
          tag: 'meta',
          attrs: {
            property: 'og:image',
            content: 'https://mrbro.dev/dev-like/og-image.png',
          },
        },
        {
          tag: 'meta',
          attrs: {
            property: 'og:image:width',
            content: '1200',
          },
        },
        {
          tag: 'meta',
          attrs: {
            property: 'og:image:height',
            content: '630',
          },
        },
        {
          tag: 'meta',
          attrs: {
            property: 'og:type',
            content: 'website',
          },
        },
        {
          tag: 'meta',
          attrs: {
            property: 'og:site_name',
            content: 'dev-like',
          },
        },
        {
          tag: 'meta',
          attrs: {
            name: 'twitter:card',
            content: 'summary_large_image',
          },
        },
        {
          tag: 'meta',
          attrs: {
            name: 'twitter:image',
            content: 'https://mrbro.dev/dev-like/og-image.png',
          },
        },
      ],
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/marcusrbrown/dev-like',
        },
      ],
      sidebar: [
        {
          label: 'Registry',
          items: [{ autogenerate: { directory: '_generated' } }],
        },
        { label: 'Ethics & Consent', slug: 'ethics' },
      ],
      routeMiddleware: './src/routeMiddleware.ts',
    }),
  ],
})

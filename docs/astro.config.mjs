import { unified } from '@astrojs/markdown-remark'
import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'
import rehypeMermaid from 'rehype-mermaid'

export default defineConfig({
  site: 'https://mrbro.dev',
  base: '/dev-like',
  trailingSlash: 'always',
  markdown: {
    processor: unified({
      rehypePlugins: [
        [
          rehypeMermaid,
          {
            strategy: 'inline-svg',
            mermaidConfig: {
              theme: 'dark',
              themeVariables: {
                primaryColor: '#182225',
                primaryTextColor: '#f3f6f7',
                primaryBorderColor: '#59d3c8',
                lineColor: '#59d3c8',
                secondaryColor: '#243033',
                tertiaryColor: '#101719',
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
    }),
  ],
})

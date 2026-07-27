import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://vertex-docs.pages.dev",
  integrations: [
    starlight({
      title: "Vertex",
      description:
        "Documentation for the Vertex browser workbench, installed app, and embeddable editor.",
      favicon: "/favicon.svg",
      customCss: ["./src/styles/custom.css"],
      editLink: {
        baseUrl:
          "https://github.com/Andersseen/vertex/edit/main/apps/docs/src/content/docs/",
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/Andersseen/vertex",
        },
      ],
      sidebar: [
        {
          label: "Start here",
          items: [
            { label: "Introduction", slug: "" },
            { label: "Getting started", slug: "getting-started" },
            { label: "Commands", slug: "reference/commands" },
          ],
        },
        {
          label: "Products",
          items: [
            { label: "Choose a surface", slug: "products/overview" },
            { label: "Browser workbench", slug: "products/web-workbench" },
            { label: "Installed app", slug: "products/installed-app" },
          ],
        },
        {
          label: "Embeddable editor",
          items: [
            { label: "Overview", slug: "editor/overview" },
            { label: "Installation", slug: "editor/installation" },
            { label: "API reference", slug: "editor/api" },
            { label: "Theming", slug: "editor/theming" },
          ],
        },
        {
          label: "Architecture",
          items: [
            { label: "System overview", slug: "architecture/overview" },
            {
              label: "Package boundaries",
              slug: "architecture/package-boundaries",
            },
          ],
        },
        {
          label: "Project",
          items: [
            { label: "Roadmap", slug: "project/roadmap" },
            { label: "Contributing", slug: "project/contributing" },
          ],
        },
      ],
    }),
  ],
});

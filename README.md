# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/c67126f2-0840-4136-8597-d323d890de00

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/c67126f2-0840-4136-8597-d323d890de00) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/c67126f2-0840-4136-8597-d323d890de00) and click on Share -> Publish.

### Deploying to GitHub Pages

This repository now contains an automated GitHub Actions workflow that builds the production bundle and publishes it to GitHub Pages. To enable it:

1. In your repository settings set **Pages → Build and deployment** to use **GitHub Actions**.
2. Push to the `main` branch. The workflow (`.github/workflows/deploy.yml`) will install dependencies, run `npm run build:pages`, upload the generated `docs/` folder as an artifact and deploy it.

You can also build the `docs/` folder locally when you need to inspect the production output:

```sh
npm run build:pages
npm run preview:pages
```

### Preparing a PWA package for RuStore

Run the dedicated PWA build to generate a bundle with a root base path that PWA Builder can ingest:

```sh
npm run build:pwa
```

The optimized assets are written to `dist/`. Upload the resulting `dist/manifest.webmanifest` (plus the icon files from `public/`) to [PWA Builder](https://www.pwabuilder.com/) to create the RuStore package. You can locally verify the package with:

```sh
npm run preview:pwa
```

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

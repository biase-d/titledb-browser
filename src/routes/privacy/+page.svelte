<script>
    import Icon from "@iconify/svelte";
</script>

<svelte:head>
    <title>Privacy Policy | Switch Performance</title>
</svelte:head>

<div class="legal-page">
    <header class="legal-header">
        <div class="icon-circle">
            <Icon icon="mdi:shield-check" width="48" height="48" />
        </div>
        <h1>Privacy Policy</h1>
        <p class="last-updated">Last Updated: February 15, 2026</p>
    </header>

    <div class="legal-content">
        <section>
            <h2>1. Introduction</h2>
            <p>
                Switch Performance ("we", "our", or "the project") is a
                community-powered database for Nintendo Switch performance data.
                We value your privacy and aim to be transparent about how we
                handle your data.
            </p>
        </section>

        <section>
            <h2>2. Data Collection</h2>
            <h3>GitHub Authentication</h3>
            <p>
                When you sign in using GitHub, we collect your GitHub username,
                public profile URL, and avatar. This is used solely to identify
                your contributions and display your name on our contributors'
                list. We do not have access to your private GitHub data or
                repositories.
            </p>

            <h3>Preferences & Local Storage</h3>
            <p>
                We use your browser's local storage and cookies to save your
                site preferences, such as:
            </p>
            <ul>
                <li>Preferred Region</li>
                <li>Adaptive Theme settings</li>
                <li>Favorite Site Color</li>
                <li>High-resolution image preferences</li>
            </ul>
            <p>
                This data stays on your device and is not shared with us or any
                third parties.
            </p>
        </section>

        <section>
            <h2>3. Third-Party Services</h2>
            <p>
                We use the following third-party services which may collect data
                according to their own privacy policies:
            </p>
            <ul>
                <li>
                    <strong>Iconify:</strong> To provide icons across the interface.
                </li>
                <li>
                    <strong>GitHub:</strong> For authentication and contribution
                    tracking.
                </li>
                <li>
                    <strong>Cloudflare (if applicable):</strong> For hosting and
                    content delivery.
                </li>
            </ul>
        </section>

        <section>
            <h2>4. Your Rights</h2>
            <p>
                Since we do not collect personal email addresses or sensitive
                data (unless explicitly part of your public GitHub profile),
                your primary control is through your GitHub account settings.
                You can disconnect Switch Performance from your GitHub
                Authorized Applications at any time.
            </p>
        </section>

        <section>
            <h2>5. Contact</h2>
            <p>
                For any questions regarding this policy, please open an issue on
                our <a
                    href="https://github.com/biase-d/titledb-browser/issues"
                    target="_blank"
                    rel="noopener noreferrer">GitHub repository</a
                >.
            </p>
        </section>
    </div>
</div>

<style>
    .legal-page {
        max-width: 800px;
        margin: 4rem auto;
        padding: 0 1.5rem;
    }

    .legal-header {
        text-align: center;
        margin-bottom: 4rem;
    }

    .icon-circle {
        width: 80px;
        height: 80px;
        background: color-mix(in srgb, var(--primary-color) 15%, transparent);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 1.5rem;
        color: var(--primary-color);
    }

    .legal-header h1 {
        font-size: 2.5rem;
        font-weight: 900;
        margin-bottom: 0.5rem;
        color: var(--text-primary);
    }

    .last-updated {
        color: var(--text-secondary);
        font-size: 0.9rem;
    }

    .legal-content {
        background: var(--surface-color);
        padding: 2.5rem;
        border-radius: var(--radius-lg);
        border: 1px solid var(--border-color);
        line-height: 1.7;
        color: var(--text-body);
    }

    section {
        margin-bottom: 2.5rem;
    }

    section:last-child {
        margin-bottom: 0;
    }

    h2 {
        font-size: 1.5rem;
        font-weight: 800;
        color: var(--text-primary);
        margin-bottom: 1rem;
        border-bottom: 2px solid var(--border-color);
        padding-bottom: 0.5rem;
    }

    h3 {
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--text-primary);
        margin: 1.5rem 0 0.5rem;
    }

    ul {
        padding-left: 1.5rem;
        margin: 1rem 0;
    }

    li {
        margin-bottom: 0.5rem;
    }

    a {
        color: var(--primary-color);
        text-decoration: underline;
        text-underline-offset: 3px;
    }

    @media (max-width: 640px) {
        .legal-page {
            margin: 2rem auto;
        }
        .legal-content {
            padding: 1.5rem;
        }
    }
</style>

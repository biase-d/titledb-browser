<script>
    import Icon from '@iconify/svelte'
</script>

<svelte:head>
    <title>Legal & Disclaimers | Switch Performance</title>
</svelte:head>

<div class="legal-page">
    <header class="legal-header">
        <div class="icon-circle">
            <Icon icon="mdi:gavel" width="48" height="48" />
        </div>
        <h1>Legal & Disclaimers</h1>
        <p class="last-updated">Last Updated: February 15, 2026</p>
    </header>

    <div class="legal-content">
        <section class="warning-section">
            <div class="alert-box">
                <Icon icon="mdi:alert-decagram" />
                <span
                    >Switch Performance is not affiliated with, endorsed by, or
                    in any way officially connected to Nintendo Co., Ltd.</span
                >
            </div>
        </section>

        <section>
            <h2>1. Trademark Disclaimer</h2>
            <p>
                "Nintendo Switch" is a registered trademark of Nintendo Co.,
                Ltd. All other trademarks, service marks, product names, and
                company names or logos mentioned on this site are the property
                of their respective owners.
            </p>
            <p>
                Reference to any products, services, processes, or other
                information by trade name, trademark, manufacturer, supplier, or
                otherwise does not constitute or imply endorsement, sponsorship,
                or recommendation thereof by us.
            </p>
        </section>

        <section>
            <h2>2. Information Accuracy</h2>
            <p>
                The performance data (FPS, resolutions, graphics settings)
                presented on this site is <strong>community-powered</strong>.
                While we strive for accuracy, the information is provided "as
                is" without any warranties of any kind.
            </p>
            <p>
                Actual performance may vary depending on firmware versions, game
                updates, hardware conditions, and other factors. Use this data
                for informational purposes only.
            </p>
        </section>

        <section>
            <h2>3. External Links</h2>
            <p>
                This site contains links to external websites (such as GitHub,
                and YouTube). We have no control over the content and practices
                of these sites and cannot accept responsibility or liability for
                their respective privacy policies.
            </p>
        </section>

        <section>
            <h2>4. Limitation of Liability</h2>
            <p>
                In no event shall Switch Performance or its contributors be
                liable for any damages arising out of the use or inability to
                use the materials on this website, even if we have been notified
                orally or in writing of the possibility of such damage.
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

    .alert-box {
        background: color-mix(
            in srgb,
            var(--primary-color) 10%,
            var(--surface-color)
        );
        border-left: 4px solid var(--primary-color);
        padding: 1.25rem;
        border-radius: var(--radius-md);
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 2rem;
        color: var(--text-primary);
        font-weight: 600;
        font-size: 1rem;
    }

    .alert-box :global(svg) {
        flex-shrink: 0;
        color: var(--primary-color);
        font-size: 1.5rem;
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

    @media (max-width: 640px) {
        .legal-page {
            margin: 2rem auto;
        }
        .legal-content {
            padding: 1.5rem;
        }
    }
</style>

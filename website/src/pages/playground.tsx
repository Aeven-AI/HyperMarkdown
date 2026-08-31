import BrowserOnly from "@docusaurus/BrowserOnly";
import Layout from "@theme/Layout";

export default function PlaygroundPage() {
  return (
    <Layout
      title="Playground"
      description="Stream Markdown through HyperMarkdown in the browser. Adjust chunk size, plugins, and share the URL."
    >
      <BrowserOnly fallback={<div className="playground">Loading playground…</div>}>
        {() => {
          const PlaygroundApp = require("../components/playground/PlaygroundApp").default;
          return <PlaygroundApp />;
        }}
      </BrowserOnly>
    </Layout>
  );
}

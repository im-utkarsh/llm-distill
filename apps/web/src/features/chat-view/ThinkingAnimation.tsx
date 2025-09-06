// apps/web/src/features/chat-view/ThinkingAnimation.tsx

/**
 * A simple component that renders a blinking block, used as a placeholder
 * while waiting for the first token from the model.
 * @returns {React.ReactElement} A span element with a blinking animation.
 */
export default function ThinkingAnimation() {
  return (
    <span className="animate-blink bg-crt-model-green w-3 h-5 inline-block"></span>
  );
}
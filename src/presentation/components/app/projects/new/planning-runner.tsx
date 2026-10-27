import "./planning-runner.css";

// MiniMax loop of the lime runner. Muted so the storyboard wait can autoplay.
export function PlanningRunner() {
	return (
		<div className="planning-runner" aria-hidden>
			<video
				className="planning-runner__video"
				src="/loading/planning-runner.mp4"
				autoPlay
				loop
				muted
				playsInline
				preload="auto"
			/>
		</div>
	);
}

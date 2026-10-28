import Image from "next/image";
import "./planning-runner.css";

const INK = "#12141c";
const LIME = "#c6f24b";

// Storyboard creation loading animation: filmstrip rails, dual orbital rings, and the official Scro platform logo (/logo-mark.png).
export function PlanningRunner() {
	return (
		<div className="planning-load" aria-hidden>
			<svg className="planning-load__svg" viewBox="0 0 840 360">
				{/* Left & right storyboard filmstrip rails */}
				<g className="planning-load__rail" stroke={INK} strokeLinecap="round">
					<line x1="72" y1="180" x2="250" y2="180" strokeWidth="2" />
					<line x1="590" y1="180" x2="768" y2="180" strokeWidth="2" />
					{[96, 140, 184, 228].map((x) => (
						<line key={x} x1={x} y1="168" x2={x} y2="192" strokeWidth="3" />
					))}
					{[612, 656, 700, 744].map((x) => (
						<line key={x} x1={x} y1="168" x2={x} y2="192" strokeWidth="3" />
					))}
				</g>

				{/* Outer dashed orbit */}
				<g className="planning-load__orbit">
					<circle
						cx="420"
						cy="180"
						r="132"
						fill="none"
						stroke={INK}
						strokeWidth="2"
						strokeDasharray="3 11"
					/>
					<circle cx="420" cy="48" r="5" fill={INK} />
				</g>

				{/* Reverse lime sweep orbit */}
				<g className="planning-load__orbit planning-load__orbit--reverse">
					<circle
						cx="420"
						cy="180"
						r="150"
						fill="none"
						stroke={LIME}
						strokeWidth="7"
						strokeLinecap="round"
						strokeDasharray="56 886"
					/>
					<circle
						cx="570"
						cy="180"
						r="7"
						fill={LIME}
						stroke={INK}
						strokeWidth="3"
					/>
				</g>

				{/* Inner pulse ring behind the platform logo */}
				<circle
					className="planning-load__pulse"
					cx="420"
					cy="180"
					r="74"
					fill="none"
					stroke={LIME}
					strokeWidth="3"
				/>
			</svg>

			{/* Official top-left platform logo (/logo-mark.png) with lime offset shadow */}
			<div className="planning-load__logo-wrap">
				<span className="planning-load__logo-glow" />
				<span className="planning-load__logo-shadow" />
				<span className="planning-load__logo-card">
					<Image
						src="/logo-mark.png"
						alt=""
						width={160}
						height={160}
						priority
						unoptimized
						className="planning-load__logo-img"
					/>
				</span>
			</div>
		</div>
	);
}

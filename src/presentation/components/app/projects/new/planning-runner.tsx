import "./planning-runner.css";

const INK = "#12141c";
const LIME = "#c6f24b";

// Scro scroll-S, same curve as public/logo-mark.svg.
const MARK_PATH =
	"M338 148 C338 112 174 108 174 176 C174 228 292 214 308 258 C328 312 196 300 188 364 C180 428 352 424 352 372";

// Storyboard wait mark: ink tile, lime offset, and an orbit. No video.
export function PlanningRunner() {
	return (
		<div className="planning-load" aria-hidden>
			<svg className="planning-load__svg" viewBox="0 0 840 360">
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
					<circle cx="570" cy="180" r="7" fill={LIME} stroke={INK} strokeWidth="3" />
				</g>

				<g className="planning-load__mark">
					<rect className="planning-load__sticker" x="370" y="130" width="120" height="120" rx="28" fill={LIME} />
					<rect x="360" y="120" width="120" height="120" rx="28" fill={INK} />
					<svg x="382" y="138" width="76" height="84" viewBox="150 90 230 360">
						<path
							className="planning-load__s"
							d={MARK_PATH}
							fill="none"
							stroke={LIME}
							strokeWidth="52"
							strokeLinecap="round"
							pathLength="100"
						/>
					</svg>
				</g>
			</svg>
		</div>
	);
}

import "./planning-runner.css";

const INK = "var(--accent-ink, #12141c)";
const LIME = "var(--lime, #c6f24b)";

// One tile of the loop. A second copy sits at x=480 so the scroll is seamless.
function RunnerWorld({ origin }: { origin: number }) {
	return (
		<g transform={`translate(${origin} 0)`}>
			<line x1="0" y1="162" x2="480" y2="162" stroke={INK} strokeWidth="3" strokeLinecap="round" />
			{Array.from({ length: 12 }, (_, index) => (
				<line
					key={index}
					x1={20 + index * 40}
					y1="162"
					x2={20 + index * 40}
					y2="170"
					stroke={INK}
					strokeWidth="2"
					strokeLinecap="round"
				/>
			))}
			{/* Storyboard card. Center x=211, cleared on the 17% jump. */}
			<g transform="translate(188 136)">
				<clipPath id={`planning-card-${origin}`}>
					<rect width="46" height="26" rx="4" />
				</clipPath>
				<g clipPath={`url(#planning-card-${origin})`}>
					<rect width="46" height="26" fill="#fff" />
					<rect width="46" height="7" fill={LIME} />
					<line x1="8" y1="15" x2="32" y2="15" stroke={INK} strokeWidth="2" strokeLinecap="round" />
					<line x1="8" y1="20" x2="22" y2="20" stroke={INK} strokeWidth="2" strokeLinecap="round" />
				</g>
				<rect width="46" height="26" rx="4" fill="none" stroke={INK} strokeWidth="2.5" />
			</g>
			{/* Hurdle. Center x=354, cleared on the 47% jump. */}
			<g transform="translate(340 0)">
				<line x1="0" y1="162" x2="0" y2="140" stroke={INK} strokeWidth="3" strokeLinecap="round" />
				<line x1="28" y1="162" x2="28" y2="140" stroke={INK} strokeWidth="3" strokeLinecap="round" />
				<line x1="-2" y1="140" x2="30" y2="140" stroke={LIME} strokeWidth="5" strokeLinecap="round" />
			</g>
			{/* Rock. Center x=452, cleared on the 68% hop. */}
			<ellipse cx="452" cy="156" rx="14" ry="7" fill="#fff" stroke={INK} strokeWidth="2.5" />
		</g>
	);
}

// Brand doodle runner: ink line, lime shirt, facing right.
function Runner() {
	return (
		<g transform="translate(128 136)">
			<g className="planning-runner__jump">
				<rect x="-30" y="-72" width="64" height="98" fill="#fff" opacity="0" />
				<g className="planning-runner__streaks" stroke={INK} strokeWidth="2" strokeLinecap="round">
					<line x1="-20" y1="-28" x2="-36" y2="-26" />
					<line x1="-18" y1="-18" x2="-38" y2="-16" />
					<line x1="-16" y1="-8" x2="-32" y2="-6" />
				</g>
				<g transform="translate(-2 -22)">
					<g className="planning-runner__arm planning-runner__arm--back">
						<path d="M0 0 L-14 16" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
						<circle cx="-14" cy="16" r="2.4" fill={INK} />
					</g>
				</g>
				<path
					d="M-12 -6 C-14 -20 -6 -32 2 -32 C12 -32 16 -20 14 -6 C10 4 -8 4 -12 -6 Z"
					fill={LIME}
					stroke={INK}
					strokeWidth="2.5"
				/>
				<g className="planning-runner__tuck">
					<g transform="translate(-3 2)">
						<g className="planning-runner__leg planning-runner__leg--back">
							<path
								d="M0 0 L-12 18 L-2 22"
								fill="none"
								stroke={INK}
								strokeWidth="4"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</g>
					</g>
					<g transform="translate(3 2)">
						<g className="planning-runner__leg planning-runner__leg--front">
							<path
								d="M0 0 L14 18 L22 20"
								fill="none"
								stroke={INK}
								strokeWidth="4"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</g>
					</g>
				</g>
				<g transform="translate(4 -22)">
					<g className="planning-runner__arm planning-runner__arm--front">
						<path d="M0 0 L16 14" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
						<circle cx="16" cy="14" r="2.4" fill={INK} />
					</g>
				</g>
				<circle cx="8" cy="-48" r="16" fill="#fff" stroke={INK} strokeWidth="2.5" />
				<g fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round">
					<path d="M-2 -60 L-5 -72" />
					<path d="M4 -62 L3 -68" />
					<path d="M10 -61 L13 -70" />
					<path d="M-6 -46 C-12 -44 -12 -36 -6 -38" />
					<path d="M10 -42 Q15 -39 18 -43" />
				</g>
				<circle cx="14" cy="-49" r="1.8" fill={INK} />
			</g>
		</g>
	);
}

// White looping runner shown while storyboard planning is in progress.
export function PlanningRunner() {
	return (
		<div className="planning-runner" aria-hidden>
			<div className="planning-runner__stage">
				<svg className="planning-runner__world" viewBox="0 0 960 200" preserveAspectRatio="none">
					<RunnerWorld origin={0} />
					<RunnerWorld origin={480} />
				</svg>
				<svg className="planning-runner__actor" viewBox="0 0 480 200" preserveAspectRatio="none">
					<ellipse className="planning-runner__shadow" cx="136" cy="164" rx="18" ry="4" fill={INK} />
					<Runner />
				</svg>
			</div>
		</div>
	);
}

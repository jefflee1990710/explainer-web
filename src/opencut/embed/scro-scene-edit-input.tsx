"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/opencut/components/ui/button";
import { Textarea } from "@/opencut/components/ui/textarea";
import { requestScroSceneEdit } from "@/opencut/embed/scro-video-actions";
import { listenFromScro } from "@/opencut/embed/scro-transport";
import type { ScroSceneEditResultMessage } from "@/opencut/embed/scro-video-types";

const MESSAGE_MAX = 2000;

// One instruction for this clip. No transcript.
export function ScroSceneEditInput({
	videoId,
	clipNumber,
}: {
	videoId: string;
	clipNumber: number;
}) {
	const [input, setInput] = useState("");
	const [sending, setSending] = useState(false);
	const [note, setNote] = useState("");
	const pendingId = useRef("");
	const canSend = !sending && input.trim().length > 0;

	useEffect(() => {
		setInput("");
		setSending(false);
		setNote("");
		pendingId.current = "";
	}, [clipNumber]);

	useEffect(() => {
		return listenFromScro((payload) => {
			const data = payload as ScroSceneEditResultMessage;
			if (data?.type !== "scro-scene-edit-result") return;
			if (data.requestId !== pendingId.current) return;
			pendingId.current = "";
			setSending(false);
			setNote(data.ok ? "Updated" : data.error || "Could not update this clip");
		});
	}, []);

	function submit() {
		const message = input.trim();
		if (!message || sending) return;
		const requestId = crypto.randomUUID();
		pendingId.current = requestId;
		setSending(true);
		setNote("");
		setInput("");
		requestScroSceneEdit({ videoId, clipNumber, message, requestId });
	}

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				submit();
			}}
			className="border-border bg-background shrink-0 border-t p-2"
		>
			<div className="text-muted-foreground mb-1.5 text-[0.65rem] font-medium tracking-wide uppercase">
				Edit with AI
			</div>
			<div className="flex items-end gap-1.5">
				<Textarea
					rows={3}
					value={input}
					maxLength={MESSAGE_MAX}
					disabled={sending}
					aria-label="Edit with AI"
					placeholder="Describe the change"
					onChange={(event) => setInput(event.target.value)}
					className="border-border bg-input text-foreground min-h-16 min-w-0 flex-1 px-2 py-1.5 text-xs"
				/>
				<Button type="submit" size="sm" variant="secondary" disabled={!canSend}>
					{sending ? "…" : "Send"}
				</Button>
			</div>
			{note ? <p className="text-muted-foreground mt-1 text-[0.65rem]">{note}</p> : null}
		</form>
	);
}

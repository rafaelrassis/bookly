import type { RefObject } from "react";
import { Avatar } from "@/components/Avatar";
import { SectionTitle } from "@/components/SectionTitle";
import { Spinner } from "@/components/Spinner";
import { formatClockTime } from "@/lib/format";
import type { ClubMember, ClubMessage } from "@/lib/types";

/** Destaca menções (@usuario) em foil dentro do texto da bolha. */
function MentionText({ text }: { text: string }) {
  const parts = text.split(/(@[\w.\-á-úà-ùâ-ûã-õç]+)/gi);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          <span key={i} className="font-bold text-foil">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function Bubble({
  message,
  own,
  onReply,
}: {
  message: ClubMessage;
  own: boolean;
  onReply: (m: ClubMessage) => void;
}) {
  if (message.system) {
    return (
      <p className="my-1 text-center text-xs text-paperDim">
        <MentionText text={message.text} />
      </p>
    );
  }

  return (
    <div className={`flex gap-2.5 ${own ? "flex-row-reverse" : ""}`}>
      {!own && (
        <Avatar
          user={message.user}
          avatarIndex={message.avatar}
          avatarUrl={message.avatarUrl}
          size={30}
          className="mt-0.5"
        />
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
          own ? "border border-foil/40 bg-foil/10" : "bg-card"
        }`}
      >
        <p className="flex items-baseline gap-2 text-xs">
          <span className="font-bold">{own ? "você" : message.user}</span>
          <span className="text-[10px] text-paperDim">{formatClockTime(message.time)}</span>
        </p>
        {message.replyTo && (
          <p className="mt-1.5 border-l-2 border-foil/60 pl-2 text-xs italic text-paperDim">
            <span className="font-bold not-italic">{message.replyTo.user}</span>{" "}
            {message.replyTo.text.length > 80
              ? `${message.replyTo.text.slice(0, 80)}…`
              : message.replyTo.text}
          </p>
        )}
        <p className="mt-1 text-sm">
          <MentionText text={message.text} />
        </p>
        <button
          type="button"
          onClick={() => onReply(message)}
          className="mt-1 text-[10px] font-bold text-paperDim hover:text-foil"
        >
          Responder
        </button>
      </div>
    </div>
  );
}

type Props = {
  joined: boolean;
  messages: ClubMessage[];
  me: string;
  draft: string;
  replyTo: ClubMessage | null;
  suggestions: string[];
  avatarByHandle: Map<string, ClubMember>;
  publishing: boolean;
  inputRef: RefObject<HTMLInputElement>;
  feedEndRef: RefObject<HTMLDivElement>;
  onDraftChange: (value: string) => void;
  onPublish: () => void;
  onReply: (message: ClubMessage) => void;
  onCancelReply: () => void;
  onApplyMention: (mention: string) => void;
};

/** Mural do clube: chat em tempo (quase) real com menções e resposta. */
export function MuralSection({
  joined,
  messages,
  me,
  draft,
  replyTo,
  suggestions,
  avatarByHandle,
  publishing,
  inputRef,
  feedEndRef,
  onDraftChange,
  onPublish,
  onReply,
  onCancelReply,
  onApplyMention,
}: Props) {
  return (
    <section className="mb-4 mt-6">
      <SectionTitle>Mural</SectionTitle>

      {joined ? (
        <>
          <div className="mt-3 flex max-h-[26rem] flex-col gap-3 overflow-y-auto">
            {messages.map((message) => (
              <Bubble
                key={message.id}
                message={message}
                own={message.user === me && !message.system}
                onReply={onReply}
              />
            ))}
            {messages.length === 0 && (
              <p className="text-sm text-paperDim">Ainda não há mensagens. Comece a conversa!</p>
            )}
            <div ref={feedEndRef} />
          </div>

          <div className="mt-4">
            {replyTo && (
              <div className="mb-2 flex items-start justify-between gap-2 rounded-xl border-l-2 border-foil bg-card px-3 py-2 text-xs text-paperDim">
                <p className="min-w-0">
                  Respondendo <span className="font-bold text-paper">{replyTo.user}</span>:{" "}
                  <span className="italic">
                    {replyTo.text.length > 60 ? `${replyTo.text.slice(0, 60)}…` : replyTo.text}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={onCancelReply}
                  aria-label="Cancelar resposta"
                  className="shrink-0 text-paperDim hover:text-ribbonText"
                >
                  ✕
                </button>
              </div>
            )}
            {suggestions.length > 0 && (
              <div className="mb-2 overflow-hidden rounded-xl border border-line bg-card">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onApplyMention(s)}
                    className="flex w-full items-center gap-2 border-b border-line px-3 py-2 text-left text-sm last:border-b-0 hover:bg-card2"
                  >
                    <Avatar
                      user={s}
                      avatarIndex={avatarByHandle.get(s)?.avatar}
                      avatarUrl={avatarByHandle.get(s)?.avatarUrl}
                      size={22}
                    />
                    <span className="font-bold text-foil">{s}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Avatar user={me} size={30} />
              <input
                ref={inputRef}
                type="text"
                value={draft}
                onChange={(e) => onDraftChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && suggestions.length === 0) onPublish();
                }}
                placeholder="Escreva para o clube… use @ para marcar"
                aria-label="Publicar no mural"
                className="min-w-0 flex-1 rounded-full border border-line bg-card px-4 py-2.5 text-sm text-paper"
              />
              <button
                type="button"
                onClick={onPublish}
                disabled={!draft.trim() || publishing}
                className="flex items-center justify-center rounded-full bg-foil px-3.5 py-2.5 text-xs font-bold text-leather disabled:opacity-40"
              >
                {publishing ? <Spinner size={14} className="text-leather" /> : "Publicar"}
              </button>
            </div>
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-paperDim">Participe do clube pra ver e escrever no mural.</p>
      )}
    </section>
  );
}

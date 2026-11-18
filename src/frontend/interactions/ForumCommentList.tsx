import Link from "next/link";
import type { ForumComment } from "@/backend/interactions/comments";
import { CommentComposer } from "./CommentComposer";
import { CommentModerationActions } from "./CommentModerationActions";
import { ReportForm } from "./ReportForm";

const dateFormatter = new Intl.DateTimeFormat("es-BO", { dateStyle: "medium", timeStyle: "short" });

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Fecha no disponible" : dateFormatter.format(date);
}

export function ForumCommentList({
  postId,
  comments,
  canComment,
  canReport,
  canModerate,
  isAuthenticated,
}: {
  postId: string;
  comments: ForumComment[];
  canComment: boolean;
  canReport: boolean;
  canModerate: boolean;
  isAuthenticated: boolean;
}) {
  return (
    <section className="forum-comments-section" aria-labelledby="forum-comments-title">
      <div className="forum-comments-heading">
        <p className="eyebrow">CONVERSACIÓN</p>
        <h2 id="forum-comments-title">Comentarios <span>({comments.length})</span></h2>
      </div>
      {canComment ? <CommentComposer canComment={canComment} postId={postId} /> : (
        <p className="forum-form-note">
          {isAuthenticated
            ? "Tu membresía debe estar activa para comentar."
            : <><Link href="/acceso">Inicia sesión</Link> y cuenta con membresía activa para participar.</>}
        </p>
      )}
      {comments.length ? (
        <div className="forum-comment-list">
          {comments.map((comment) => (
            <article className={`forum-comment-card forum-comment-${comment.status}`} id={`comment-${comment.id}`} key={comment.id}>
              <header className="forum-comment-meta">
                <strong>{comment.authorName}{comment.authorUsername ? ` · @${comment.authorUsername}` : ""}</strong>
                <time dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time>
                {comment.parentId ? <span>Respuesta</span> : null}
                {canModerate && comment.status !== "published" ? <span className="forum-comment-status">{comment.status === "hidden" ? "Oculto" : "Eliminado"}</span> : null}
              </header>
              <p className="forum-comment-body">{comment.body}</p>
              <div className="forum-comment-actions">
                {!comment.parentId ? <CommentComposer canComment={canComment} parentId={comment.id} postId={postId} /> : null}
                {comment.status === "published" ? (
                  <ReportForm canReport={canReport} isAuthenticated={isAuthenticated} targetId={comment.id} targetType="comment" />
                ) : null}
              </div>
              {canModerate ? <CommentModerationActions commentId={comment.id} status={comment.status} /> : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="forum-empty-state">
          <h3>Aún no hay comentarios.</h3>
          <p>La conversación comienza con una pregunta, una idea o una fuente útil.</p>
        </div>
      )}
    </section>
  );
}

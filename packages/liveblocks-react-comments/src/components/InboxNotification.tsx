"use client";

import type {
  CommentData,
  InboxNotificationData,
  ThreadInboxNotificationData,
} from "@liveblocks/core";
import { assertNever, getMentionedIdsFromCommentBody } from "@liveblocks/core";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import React, { forwardRef, useMemo } from "react";

import { useOverrides } from "../overrides";
import { Timestamp } from "../primitives/Timestamp";
import { classNames } from "../utils/class-names";
import { Avatar, type AvatarProps } from "./internal/Avatar";
import { List } from "./internal/List";
import { User } from "./internal/User";

const THREAD_INBOX_NOTIFICATION_MAX_COMMENTS = 3;

type ThreadInboxNotificationCommentsContents = {
  type: "comments";
  unread: boolean;
  comments: CommentData[];
  userIds: string[];
  date: Date;
};

type ThreadInboxNotificationMentionContents = {
  type: "mention";
  unread: boolean;
  comments: CommentData[];
  userIds: string[];
  date: Date;
};

type ThreadInboxNotificationContents =
  | ThreadInboxNotificationCommentsContents
  | ThreadInboxNotificationMentionContents;

export interface InboxNotificationProps
  extends ComponentPropsWithoutRef<"div"> {
  /**
   * The inbox notification to display.
   */
  inboxNotification: InboxNotificationData;
}

interface InboxNotificationLayoutProps
  extends Omit<ComponentPropsWithoutRef<"div">, "title"> {
  aside: ReactNode;
  title: ReactNode;
  date: Date | string | number;
  unread?: boolean;
  interactive?: boolean;
}

const InboxNotificationLayout = forwardRef<
  HTMLDivElement,
  InboxNotificationLayoutProps
>(
  (
    {
      children,
      aside,
      title,
      date,
      unread,
      interactive = true,
      className,
      ...props
    },
    forwardedRef
  ) => {
    const $ = useOverrides();

    return (
      <div
        className={classNames("lb-root lb-inbox-notification", className)}
        dir={$.dir}
        data-unread={unread ? "" : undefined}
        data-interactive={interactive ? "" : undefined}
        {...props}
        ref={forwardedRef}
      >
        <div className="lb-inbox-notification-aside">{aside}</div>
        <div className="lb-inbox-notification-content">
          <div className="lb-inbox-notification-header">
            <span className="lb-inbox-notification-title">{title}</span>
            <div className="lb-inbox-notification-details">
              <span className="lb-inbox-notification-details-labels">
                <Timestamp date={date} className="lb-inbox-notification-date" />
                {unread && (
                  <span
                    className="lb-inbox-notification-unread-indicator"
                    role="presentation"
                  />
                )}
              </span>
            </div>
          </div>
          <div className="lb-inbox-notification-body">{children}</div>
        </div>
      </div>
    );
  }
);

function InboxNotificationAvatar({ className, ...props }: AvatarProps) {
  return (
    <Avatar
      className={classNames("lb-inbox-notification-avatar", className)}
      {...props}
    />
  );
}

function findLastCommentWithMentionedId(
  comments: CommentData[],
  mentionedId: string
) {
  for (let i = comments.length - 1; i >= 0; i--) {
    const comment = comments[i];

    if (comment.body) {
      const mentionedIds = getMentionedIdsFromCommentBody(comment.body);

      if (mentionedIds.includes(mentionedId)) {
        return comment;
      }
    }
  }

  return;
}

function getUserIdsFromComments(comments: CommentData[]) {
  return Array.from(new Set(comments.map((comment) => comment.userId)));
}

function generateThreadInboxNotificationContents(
  inboxNotification: ThreadInboxNotificationData,
  userId: string
): ThreadInboxNotificationContents {
  const unreadComments = inboxNotification.thread.comments.filter((comment) => {
    if (!comment.body) {
      return false;
    }

    return inboxNotification.readAt
      ? comment.createdAt > inboxNotification.readAt &&
          comment.createdAt <= inboxNotification.notifiedAt
      : comment.createdAt <= inboxNotification.notifiedAt;
  });

  // If the thread is read, show the last comments.
  if (unreadComments.length === 0) {
    const lastComments = inboxNotification.thread.comments
      .filter((comment) => comment.body)
      .slice(-THREAD_INBOX_NOTIFICATION_MAX_COMMENTS);

    return {
      type: "comments",
      unread: false,
      comments: lastComments,
      userIds: getUserIdsFromComments(lastComments),
      date: inboxNotification.notifiedAt,
    };
  }

  const commentWithMention = findLastCommentWithMentionedId(
    unreadComments,
    userId
  );

  // If the thread contains one or more mentions for the current user, show the last comment with a mention.
  if (commentWithMention) {
    return {
      type: "mention",
      unread: true,
      comments: [commentWithMention],
      userIds: [commentWithMention.userId],
      date: commentWithMention.createdAt,
    };
  }

  const lastUnreadComments = unreadComments.slice(
    -THREAD_INBOX_NOTIFICATION_MAX_COMMENTS
  );

  // Otherwise, show the last unread comments.
  return {
    type: "comments",
    unread: true,
    comments: lastUnreadComments,
    userIds: getUserIdsFromComments(unreadComments),
    date: inboxNotification.notifiedAt,
  };
}

const ThreadInboxNotification = forwardRef<
  HTMLDivElement,
  InboxNotificationProps
>(({ inboxNotification, ...props }, forwardedRef) => {
  // TODO: How do we get the current user ID?
  const { unread, date, aside, title, content } = useMemo(() => {
    const contents = generateThreadInboxNotificationContents(
      inboxNotification,
      "TODO: get current user's ID"
    );

    switch (contents.type) {
      case "comments": {
        const reversedComments = [...contents.comments].reverse();
        const reversedUserIds = [...contents.userIds].reverse();

        const firstUserId = reversedUserIds[0];

        const aside = <InboxNotificationAvatar userId={firstUserId} />;
        // TODO: Support overrides via $ instead of hard-coding English (look at CommentReaction)
        const title = (
          <>
            <List
              values={reversedUserIds.map((userId, index) => (
                <User key={userId} userId={userId} capitalize={index === 0} />
              ))}
              // formatRemaining={$.COMMENT_REACTION_REMAINING}
              truncate={THREAD_INBOX_NOTIFICATION_MAX_COMMENTS - 1}
            />{" "}
            commented on <span>Document</span>
          </>
        );
        const content = (
          <>
            {reversedComments.map((comment) => (
              <p key={comment.id}>comment.id</p>
            ))}
          </>
        );

        return {
          unread: contents.unread,
          date: contents.date,
          aside,
          title,
          content,
        };
      }

      case "mention": {
        const mentionUserId = contents.userIds[0];
        const mentionComment = contents.comments[0];

        const aside = <InboxNotificationAvatar userId={mentionUserId} />;
        // TODO: Support overrides via $ instead of hard-coding English (look at CommentReaction)
        const title = (
          <>
            <User key={mentionUserId} userId={mentionUserId} capitalize />{" "}
            mentioned you on <span>Document</span>
          </>
        );
        const content = <p key={mentionComment.id}>mentionComment.id</p>;

        return {
          unread: contents.unread,
          date: contents.date,
          aside,
          title,
          content,
        };
      }

      default:
        return assertNever(
          contents,
          "Unexpected thread inbox notification type"
        );
    }
  }, [inboxNotification]);

  return (
    <InboxNotificationLayout
      aside={aside}
      title={title}
      date={date}
      unread={unread}
      {...props}
      ref={forwardedRef}
    >
      {content}
    </InboxNotificationLayout>
  );
});

/**
 * Displays a single inbox notification.
 *
 * @example
 * <>
 *   {inboxNotifications.map((inboxNotification) => (
 *     <InboxNotification key={inboxNotification.id} inboxNotification={inboxNotification} />
 *   ))}
 * </>
 */
export const InboxNotification = forwardRef<
  HTMLDivElement,
  InboxNotificationProps
>(({ inboxNotification, ...props }, forwardedRef) => {
  switch (inboxNotification.kind) {
    case "thread":
      return (
        <ThreadInboxNotification
          inboxNotification={inboxNotification}
          {...props}
          ref={forwardedRef}
        />
      );
  }
});
import React, { useMemo } from "react";
import { useRouter } from "next/router";
import { RoomProvider, useThreads } from "../../liveblocks.config";
import { Loading } from "../components/Loading";
import { Composer, Thread } from "@liveblocks/react-comments";

function Example() {
  const { isLoading, threads, error } = useThreads();

  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="error">There was an error while fetching the threads</div>
    );
  }

  return (
    <main>
      {threads.map((thread) => (
        <Thread
          key={thread.id}
          thread={thread}
          showComposer
          className="thread"
        />
      ))}
      <Composer className="composer" />
    </main>
  );
}

export default function Page() {
  const roomId = useOverrideRoomId("nextjs-comments-2");

  return (
    <RoomProvider id={roomId} initialPresence={{}}>
      <Example />
    </RoomProvider>
  );
}

export async function getStaticProps() {
  const API_KEY = process.env.LIVEBLOCKS_SECRET_KEY;
  const API_KEY_WARNING = process.env.CODESANDBOX_SSE
    ? `Add your secret key from https://liveblocks.io/dashboard/apikeys as the \`LIVEBLOCKS_SECRET_KEY\` secret in CodeSandbox.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-comments#codesandbox.`
    : `Create an \`.env.local\` file and add your secret key from https://liveblocks.io/dashboard/apikeys as the \`LIVEBLOCKS_SECRET_KEY\` environment variable.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-comments#getting-started.`;

  if (!API_KEY) {
    console.warn(API_KEY_WARNING);
  }

  return { props: {} };
}

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function useOverrideRoomId(roomId: string) {
  const { query } = useRouter();
  const overrideRoomId = useMemo(() => {
    return query?.roomId ? `${roomId}-${query.roomId}` : roomId;
  }, [query, roomId]);

  return overrideRoomId;
}
// Initialize Twitter client
interface RetweetCheckResult {
    hasRetweeted: boolean;
    error?: string;
}

/**
 * Check if a user has retweeted a specific tweet
 * @param username Twitter username to check
 * @param tweetId ID of the tweet to check for retweet
 * @returns Promise<RetweetCheckResult>
 */
export async function hasUserRetweeted(
    username: string,
    tweetId: string
): Promise<RetweetCheckResult> {
    try {
        const response = await fetch(
            `https://api.twitter.com/graphql/P6tZxAp8N4t5TzqtI5-0Gw/TweetDetail?variables={"focalTweetId":"${tweetId}","with_rts":true,"includePromotedContent":true,"withCommunity":true,"withQuickPromoteEligibilityTweetFields":true,"withBirdwatchNotes":true,"withVoice":true,"withV2Timeline":true}`,
            {
                headers: {
                    'Authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
                    'x-guest-token': await getGuestToken(),
                    'User-Agent': 'Mozilla/5.0',
                    'Accept': '*/*'
                }
            }
        );

        const data = await response.json();

        // Check if the specified user is in the retweeters
        const retweeters = data?.data?.threaded_conversation_with_injections?.instructions?.[0]?.entries
            ?.find((entry: any) => entry?.content?.itemContent?.tweet_results?.result?.legacy?.retweeted_status_result?.result?.rest_id === tweetId);

        const hasRetweeted = Boolean(retweeters);

        return {
            hasRetweeted,
            error: hasRetweeted ? undefined : 'No retweet found'
        };

    } catch (error) {
        console.error('Error checking retweet:', error);
        return {
            hasRetweeted: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}

async function getGuestToken(): Promise<string> {
    const response = await fetch('https://api.twitter.com/1.1/guest/activate.json', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA'
        }
    });

    const data = await response.json();
    return data.guest_token;
} 
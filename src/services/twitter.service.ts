// Initialize Twitter client
interface RetweetCheckResult {
    hasRetweeted: boolean;
    error?: string;
    tweets?: any[];
}

/**
 * Check if a user has retweeted a specific tweet
 * @param userId Twitter user ID to check (must be numeric)
 * @param tweetId ID of the tweet to check for retweet
 * @returns Promise<RetweetCheckResult>
 */
export async function hasUserRetweeted(
    userId: string,
    tweetId: string
): Promise<RetweetCheckResult> {
    try {
        // Validate that userId is numeric
        if (!/^\d+$/.test(userId)) {
            throw new Error('User ID must be numeric. Please provide a Twitter user ID, not username.');
        }

        const response = await fetch(
            `https://twitter-api71.p.rapidapi.com/UserRepliesAndTweets?user=${userId}`,
            {
                method: 'GET',
                headers: {
                    'x-rapidapi-host': 'twitter-api71.p.rapidapi.com',
                    'x-rapidapi-key': '593912ee04mshb1686f3619244c9p1f49f7jsn5d13481b3c24'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`API response error: ${response.status} - ${await response.text()}`);
        }

        const data = await response.json();
        console.log('User ID being checked:', userId);
        console.log('Tweet ID being checked:', tweetId);

        // Extract tweets from all possible locations in the response
        const entries = data?.data?.entries || [];
        console.log('Number of entries found:', entries.length);

        // Process each entry to find tweets
        const tweets = entries
            .filter((entry: any) => {
                // Get tweets from conversation modules
                if (entry?.content?.items) {
                    return entry.content.items.some((item: any) =>
                        item?.item?.content?.tweetResult?.result
                    );
                }
                // Get direct tweets
                return entry?.content?.itemContent?.tweet_results?.result;
            })
            .flatMap((entry: any) => {
                if (entry?.content?.items) {
                    // Extract tweets from conversation modules
                    return entry.content.items
                        .map((item: any) => item?.item?.content?.tweetResult?.result)
                        .filter(Boolean);
                }
                // Extract direct tweets
                return [entry?.content?.itemContent?.tweet_results?.result];
            })
            .filter(Boolean);

        console.log(`Found ${tweets.length} tweets to check`);

        // Check for retweets, quotes, or replies to the target tweet
        const hasRetweeted = tweets.some((tweet: any) => {
            const isRetweet = tweet.legacy?.retweeted_status?.id_str === tweetId;
            const isQuote = tweet.legacy?.quoted_status_id_str === tweetId;
            const isReply = tweet.legacy?.in_reply_to_status_id_str === tweetId;
            const isOriginalTweet = tweet.rest_id === tweetId;

            if (isRetweet || isQuote || isReply || isOriginalTweet) {
                console.log('Match found:', {
                    type: isRetweet ? 'retweet' : isQuote ? 'quote' : isReply ? 'reply' : 'original',
                    tweetId: tweet.rest_id,
                    userId: tweet.legacy?.user_id_str,
                    text: tweet.legacy?.full_text
                });
            }

            return isRetweet || isQuote || isReply || isOriginalTweet;
        });

        return {
            hasRetweeted,
            error: hasRetweeted ? undefined : 'User has not retweeted this tweet'
        };

    } catch (error) {
        console.error('Error checking retweet:', error);
        return {
            hasRetweeted: false,
            tweets: [],
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
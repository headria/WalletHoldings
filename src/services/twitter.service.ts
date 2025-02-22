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
        // if (!/^\d+$/.test(userId)) {
        //     throw new Error('User ID must be numeric. Please provide a Twitter user ID, not username.');
        // }

        const numId = await getUserIdFromUsername(userId);
        console.log(numId, 'numId')

        const response = await fetch(
            `https://twitter-api71.p.rapidapi.com/UserRepliesAndTweets?user=${numId}`,
            {
                method: 'GET',
                headers: {
                    'x-rapidapi-host': process.env.TWITTER_RAPIDAPI_HOST || '',
                    'x-rapidapi-key': process.env.TWITTER_RAPIDAPI_KEY || ''
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
                // Check for TimelineTimelineModule items
                if (entry?.content?.__typename === 'TimelineTimelineModule' && entry?.content?.items) {
                    return true;
                }
                // Keep existing checks
                if (entry?.content?.itemContent?.tweetResult?.result) {
                    return true;
                }
                if (entry?.content?.content?.tweetResult?.result) {
                    return true;
                }
                return false;
            })
            .flatMap((entry: any) => {
                // Handle TimelineTimelineModule items
                if (entry?.content?.__typename === 'TimelineTimelineModule' && entry?.content?.items) {
                    return entry.content.items
                        .map((item: any) => item?.item?.content?.tweetResult?.result)
                        .filter(Boolean);
                }
                // Keep existing extractions
                if (entry?.content?.itemContent?.tweetResult?.result) {
                    return [entry.content.itemContent.tweetResult.result];
                }
                if (entry?.content?.content?.tweetResult?.result) {
                    return [entry.content.content.tweetResult.result];
                }
                return [];
            });

        console.log(`Found ${tweets.length} tweets to check`);

        // Check for retweets, quotes, or replies to the target tweet
        const hasRetweeted = tweets.some((tweet: any) => {
            // Get all possible tweet IDs to check
            const currentTweetId = tweet.rest_id;
            const retweetedStatusId =
                tweet.legacy?.retweeted_status_result?.result?.rest_id ||
                tweet.legacy?.retweeted_status?.id_str;
            const quotedStatusId = tweet.legacy?.quoted_status_id_str;
            const replyStatusId = tweet.legacy?.in_reply_to_status_id_str;
            const isRetweeted = tweet.legacy?.retweeted;

            console.log('Checking tweet details:', {
                currentTweetId,
                targetTweetId: tweetId,
                retweetedStatusId,
                quotedStatusId,
                replyStatusId,
                isRetweeted,
                conversationId: tweet.legacy?.conversation_id_str
            });

            // Compare against the target tweetId passed to the function
            const isRetweet = retweetedStatusId === tweetId || isRetweeted;
            const isQuote = quotedStatusId === tweetId;
            const isReply = replyStatusId === tweetId;
            const isOriginalTweet = currentTweetId === tweetId;

            if (isRetweet || isQuote || isReply || isOriginalTweet) {
                console.log('Match found:', {
                    matchType: isRetweet ? 'retweet' : isQuote ? 'quote' : isReply ? 'reply' : 'original',
                    currentTweetId,
                    targetTweetId: tweetId
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

/**
 * Get numeric user ID from X (Twitter) username
 * @param username Twitter username (without @ symbol)
 * @returns Promise<string> Numeric user ID
 * @throws Error if username is invalid or user not found
 */
export async function getUserIdFromUsername(username: string): Promise<string> {
    try {
        // Remove @ symbol if present
        username = username.replace('@', '');

        const response = await fetch(
            `https://twitter241.p.rapidapi.com/user?username=${username}`,
            {
                method: 'GET',
                headers: {
                    'x-rapidapi-host': 'twitter241.p.rapidapi.com',
                    'x-rapidapi-key': process.env.TWITTER_RAPIDAPI_KEY || ''
                }
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Twitter API Error Response:', errorText);
            throw new Error(`Failed to fetch user ID: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('Twitter API Response:', JSON.stringify(data, null, 2));

        // Extract user ID from response - updated path based on actual response structure
        const userId = data?.result?.data?.user?.result?.rest_id;

        if (!userId) {
            throw new Error(`Could not find user ID for username: ${username}`);
        }
        return userId;
    } catch (error) {
        console.error('Error getting user ID:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to get user ID');
    }
} 
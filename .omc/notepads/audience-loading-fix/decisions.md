# Audience Loading Fix - Decisions

## Timeout Duration: 10 seconds
**Decision:** Set API request timeout to 10 seconds
**Rationale:**
- Supabase queries typically respond within 1-2 seconds
- Mobile networks can be slower (3-5 seconds acceptable)
- 10 seconds is generous enough for slow connections
- Beyond 10 seconds indicates a real problem

## Slow Loading Indicator: 5 seconds
**Decision:** Show "connection is slow" message after 5 seconds
**Rationale:**
- First 3-4 seconds feels normal to users
- After 5 seconds, users start wondering if something is wrong
- Provides feedback without being annoying
- Halfway to timeout (5s/10s) is a good balance

## Error Message Strategy
**Decision:** Different messages for timeout vs other errors
**Rationale:**
- Timeout errors are recoverable (user can retry)
- Other errors might indicate wrong credentials
- Helps users understand what to do next

## Fallback to Password Gate
**Decision:** On token timeout/error, show password gate with error message
**Rationale:**
- Token might be expired (already handled by client-side check)
- Token might be invalid
- Password is always available as fallback
- Better UX than dead end

## State Management
**Decision:** Use separate state for slow loading indicator
**Rationale:**
- `isValidating` controls overall loading state
- `showSlowLoadingIndicator` controls delayed message
- Keeps concerns separated
- Easy to clear both independently

## No Retry Button (Yet)
**Decision:** Did not add automatic retry button
**Rationale:**
- User can manually retry by refreshing or re-entering password
- Password gate already provides retry mechanism
- Avoids complexity of retry state management
- Can be added later if needed

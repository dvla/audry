import { Activity } from 'botbuilder'

export const DEFAULT_USER_ID = 'unknown_user'
const ALPHANUMERIC_REGEX = /[^a-z0-9]/gi

/**
 * Extracts a user ID from the activity's 'from' property.
 * The user ID is derived from the user's name by removing
 * all non-alphanumeric characters and converting it to lowercase.
 * @param activity - The activity containing the user's information.
 * @returns A sanitized user ID string.
 */
export const getUserId = (activity: Activity) => {
  return activity.from?.name?.replace(ALPHANUMERIC_REGEX, '').toLowerCase() || DEFAULT_USER_ID
}

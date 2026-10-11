"""Pure cardbox reschedule decision for quiz answers.

Kept dependency-free so it can be exercised in isolation.
"""

def choose_cardbox_action(correct, eligible, previously_answered, in_cardbox):
  '''Decide how an answer should affect the player's cardbox.

  correct             -- whether the answer was correct
  eligible            -- word is in the cardbox and due (server-computed,
                         echoed back from getQuestions as cardboxEligible)
  previously_answered -- this question was already answered in this quiz
  in_cardbox          -- word was in the cardbox when the question was served

  Returns one of "advance", "restore", "demote", or "none".
  '''
  if not in_cardbox:
    return "none"
  if correct:
    if eligible:
      return "advance"
    if previously_answered:
      return "restore"
    return "none"
  return "demote"

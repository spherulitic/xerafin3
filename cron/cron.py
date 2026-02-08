#!/usr/bin/env python3
"""
Xerafin Periodic Cron Script
Handles daily, weekly, monthly, and yearly operations
"""

import sys
import os
import json
import traceback
from datetime import datetime, date
from enum import Enum
from typing import List, Dict, Optional
from time import sleep

import requests
from keycloak import KeycloakOpenID
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Configure retry strategy for network requests
RETRY_STRATEGY = Retry(
  total=3,
  backoff_factor=1,
  status_forcelist=[429, 500, 502, 503, 504],
  allowed_methods=["GET", "POST"]
)

class Period(Enum):
  """Enum for time periods"""
  DAILY = "daily"
  WEEKLY = "weekly"
  MONTHLY = "monthly"
  YEARLY = "yearly"

def setup_logging():
  """Print startup information"""
  print(f"\n{'='*60}")
  print(f"Xerafin Periodic Cron - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
  print(f"{'='*60}")
  print(f"Date: {date.today()}")
  print(f"Day of week: {date.today().strftime('%A')}")
  print(f"Day of month: {date.today().day}")
  print(f"Month: {date.today().month}")
  sys.stdout.flush()

def determine_periods_for_today() -> List[Period]:
  """
  Determine which periods need to be processed today
  Returns periods in order from smallest to largest
  """
  today = date.today()
  periods = []

  # Always process daily
  periods.append(Period.DAILY)

  # Weekly: Process on Mondays (Monday = 0 in Python weekday, Monday = 1 in ISO)
  if today.weekday() == 0:  # Monday
    periods.append(Period.WEEKLY)

  # Monthly: Process on 1st day of month
  if today.day == 1:
    periods.append(Period.MONTHLY)

  # Yearly: Process on January 1st
  if today.month == 1 and today.day == 1:
    periods.append(Period.YEARLY)

  return periods

def get_period_display_name(period: Period) -> str:
  """Get a user-friendly display name for a period"""
  return {
    Period.DAILY: "Daily",
    Period.WEEKLY: "Weekly",
    Period.MONTHLY: "Monthly",
    Period.YEARLY: "Yearly"
  }[period]

def create_session_with_retries():
  """Create a requests session with retry logic"""
  session = requests.Session()
  adapter = HTTPAdapter(max_retries=RETRY_STRATEGY)
  session.mount("http://", adapter)
  session.mount("https://", adapter)
  return session

def get_keycloak_token():
  """Authenticate with Keycloak and return token"""
  print("\n[1/4] Authenticating with Keycloak...")

  KEYCLOAK_USER = os.environ.get("CRON_KUSER")
  KEYCLOAK_PASS = os.environ.get("CRON_KPASS")

  if not KEYCLOAK_USER or not KEYCLOAK_PASS:
    raise ValueError("CRON_KUSER or CRON_KPASS environment variables not set")

  keycloak_openid = KeycloakOpenID(
    server_url="http://keycloak:8080/",
    client_id="x-client",
    realm_name="Xerafin"
  )

  try:
    token = keycloak_openid.token(KEYCLOAK_USER, KEYCLOAK_PASS)
    print(f"✓ Authentication successful (expires in: {token.get('expires_in', 'unknown')}s)")
    return token['access_token']
  except Exception as e:
    print(f"✗ Authentication failed: {e}")
    raise

def make_request(session, method, url, headers=None, json_data=None, description=""):
  """Make HTTP request with error handling"""
  try:
    print(f"  Requesting: {url}")
    response = session.request(
      method=method,
      url=url,
      headers=headers,
      json=json_data,
      timeout=30
    )
    response.raise_for_status()

    if response.status_code == 200:
      print(f"  ✓ Success (Status: {response.status_code})")
      return response
    else:
      print(f"  ⚠ Warning (Status: {response.status_code})")
      return response

  except requests.exceptions.Timeout:
    print(f"  ✗ Timeout connecting to {url}")
    raise
  except requests.exceptions.ConnectionError:
    print(f"  ✗ Connection error to {url}")
    raise
  except requests.exceptions.HTTPError as e:
    print(f"  ✗ HTTP error: {e.response.status_code} - {e.response.text[:200]}")
    raise
  except Exception as e:
    print(f"  ✗ Unexpected error: {e}")
    raise

def process_period_summary(session, headers: Dict, period: Period) -> Optional[Dict]:
  """Process leaderboard summary for a specific period"""
  display_name = get_period_display_name(period)
  print(f"\n  Processing {display_name} leaderboard summary...")

  stats_url = 'http://stats:5000/periodicSummary'
  try:
    response = make_request(
      session,
      "POST",
      stats_url,
      headers=headers,
      json_data={"period": period.value},
      description=f"{display_name} leaderboard summary"
    )

    # Parse response for chat message
    stats_data = {}
    if response.status_code == 200:
      try:
        stats_data = response.json()
        print(f"  Response: {json.dumps(stats_data, indent=2)}")
        return stats_data
      except json.JSONDecodeError:
        print(f"  Note: No JSON response (status: {response.status_code})")
        return None
    return None

  except Exception as e:
    print(f"  ⚠ {display_name} leaderboard summary failed: {e}")
    return None

def generate_period_quizzes(session, headers: Dict) -> bool:
  """Generate quizzes for a all applicable periods"""
  print(f"\n  Generating quizzes...")

  quiz_url = 'http://quiz:5000/generatePeriodicQuizzes'
  try:
    make_request(
      session,
      "POST",
      quiz_url,
      headers=headers,
      description="Period quiz generation"
    )
    return True
  except Exception as e:
    print(f"  ⚠ Period quiz generation failed: {e}")
    return False

def post_chat_message(session, headers: Dict, period: Period, stats_data: Dict) -> bool:
  """Post chat message for a specific period"""
  if not stats_data or 'users' not in stats_data or 'questions' not in stats_data:
    print(f"  ⚠ Skipping {period.value} chat - incomplete stats data")
    return False

  display_name = get_period_display_name(period).lower()

  # Create appropriate chat message based on period
  if period == Period.DAILY:
    chat_text = f"Good job Xerfers! Yesterday, {stats_data['users']} users solved {stats_data['questions']} alphagrams!"
  elif period == Period.WEEKLY:
    chat_text = f"Great week Xerfers! This past week, {stats_data['users']} users solved {stats_data['questions']} alphagrams!"
  elif period == Period.MONTHLY:
    month_name = date.today().strftime('%B')
    chat_text = f"Awesome month Xerfers! In {month_name}, {stats_data['users']} users solved {stats_data['questions']} alphagrams!"
  elif period == Period.YEARLY:
    year = date.today().year - 1  # Previous year
    chat_text = f"Fantastic year Xerfers! In {year}, {stats_data['users']} users solved {stats_data['questions']} alphagrams!"

  chat_url = 'http://chat:5000/submitChat'
  chat_message = {"chatText": chat_text}

  try:
    make_request(
      session,
      "POST",
      chat_url,
      headers=headers,
      json_data=chat_message,
      description=f"{display_name.capitalize()} chat message"
    )
    return True
  except Exception as e:
    print(f"  ⚠ {display_name.capitalize()} chat message failed: {e}")
    return False

def main():
  """Main execution function"""
  start_time = datetime.now()
  session = None

  try:
    setup_logging()

    # Determine which periods to process today
    periods = determine_periods_for_today()
    if not periods:
      print("\n⚠ No periods to process today (this shouldn't happen!)")
      return 0

    print(f"\nProcessing periods: {', '.join([p.value for p in periods])}")

    # Step 1: Get authentication token
    access_token = get_keycloak_token()
    headers = {
      "Accept": "application/json",
      "Authorization": f"Bearer {access_token}"
    }

    # Create session with retries
    session = create_session_with_retries()

    # Track results for chat message
    all_stats_data = {}
    quiz_results = {}
    chat_results = {}

    # Generate quizzes for applicable periods
    quiz_success = generate_period_quizzes(session, headers)
    quiz_results[periods[0]] = quiz_success

    # Process each period
    for period in periods:
      print(f"\n{'─'*40}")
      print(f"[{periods.index(period) + 2}/4] Processing {get_period_display_name(period)} tasks...")
      print(f"{'─'*40}")

      # Process leaderboard summary
      stats_data = process_period_summary(session, headers, period)
      if stats_data:
        all_stats_data[period] = stats_data

    # Step 2: Post ONE chat message for the longest period
    print(f"\n{'─'*40}")
    print(f"[3/4] Determining chat message...")
    print(f"{'─'*40}")

    # Determine which period's chat to post (longest period that has stats)
    chat_period = None
    priority_order = [Period.YEARLY, Period.MONTHLY, Period.WEEKLY, Period.DAILY]

    for period in priority_order:
      if period in all_stats_data:
        chat_period = period
        break

    if chat_period:
      print(f"Posting {chat_period.value} chat message (longest applicable period)")
      chat_success = post_chat_message(session, headers, chat_period, all_stats_data[chat_period])
      chat_results[chat_period] = chat_success
    else:
      print("⚠ No stats data available for chat message")

    # Success! Generate summary
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()

    print(f"\n{'='*60}")
    print(f"✓ Periodic cron completed in {duration:.1f} seconds")
    print(f"  Started: {start_time.strftime('%H:%M:%S')}")
    print(f"  Finished: {end_time.strftime('%H:%M:%S')}")
    print(f"\nSummary:")
    for period in periods:
      stats_status = "✓" if period in all_stats_data else "✗"
      quiz_status = "✓" if quiz_results.get(period, False) else "✗"
      chat_status = "✓" if chat_results.get(period, False) else "─"
      if period == chat_period:
        chat_status = "✓" if chat_results.get(period, False) else "✗"
      print(f"  {get_period_display_name(period):7s}: Stats:{stats_status} Quizzes:{quiz_status} Chat:{chat_status}")
    print(f"{'='*60}\n")

    sys.stdout.flush()

    # Return error code if any critical component failed
    if not any(quiz_results.values()):
      return 1
    return 0

  except KeyboardInterrupt:
    print("\n✗ Script interrupted by user")
    return 130
  except Exception as e:
    print(f"\n{'='*60}")
    print(f"✗ FATAL ERROR: {type(e).__name__}")
    print(f"  Error: {e}")
    print(f"\nTraceback:")
    traceback.print_exc()
    print(f"{'='*60}")
    sys.stdout.flush()
    return 1
  finally:
    if session:
      session.close()

if __name__ == "__main__":
  exit_code = main()
  sys.exit(exit_code)

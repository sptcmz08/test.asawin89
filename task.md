# Task: Lottery Schedule & Countdown Implementation

## 1. Backend Logic (Schedule Calculation)
- [ ] Create `LotteryScheduleService` to calculate next draw dates.
    - [ ] Thai Govt (1st, 16th).
    - [ ] Hanoi (Daily: Special, Normal, VIP).
    - [ ] Lao (Mon, Wed, Fri).
    - [ ] Malay (Wed, Sat, Sun, Special Tue).
    - [ ] Yi Ki (Every 15 mins).
    - [ ] BAAC / GSB (1st, 16th or specific).
- [ ] Update `LotteryController@index` to return calculated schedules.

## 2. API / Data Feeding
- [ ] Ensure `LotteryType` model has necessary config fields (close time, draw time).
- [ ] Create an API endpoint or Inertia prop to pass `serverTime` and `lotteries` with `nextDraw` timestamp.

## 3. Frontend Implementation (React)
- [ ] Update `Welcome.jsx` to accept lottery data props.
- [ ] Implement `useCountdown` hook for real-time ticking.
- [ ] Update `LotteryCard.jsx` to show:
    - [ ] "Open" (Count down to close).
    - [ ] "Closed" (If current time > close time but < draw time).
    - [ ] "Processing" (If during draw).
    - [ ] Next Draw Date.

## 4. Verification
- [ ] Verify Thai Govt dates (handle weekends/holidays if simple logic allows, otherwise fixed 1/16).
- [ ] Verify Daily Lotteries rollover.
- [ ] Verify Yi Ki 15-min rounds.

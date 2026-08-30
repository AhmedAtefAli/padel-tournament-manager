import assert from 'node:assert/strict';
import test from 'node:test';
import type { Match, Team, Tournament } from '../../shared/tournament';
import { buildStandings, buildTeamJourney, teamMatchResult } from './standings.ts';

const teams: Team[] = [
  { id: 1, name: 'Alpha', players: 'A & B', played: 2, won: 1, points: 3 },
  { id: 2, name: 'Bravo', players: 'C & D', played: 2, won: 1, points: 3 },
  { id: 3, name: 'Charlie', players: 'E & F', played: 2, won: 0, points: 0 },
];
const match = (values: Partial<Match> & Pick<Match, 'id' | 'home' | 'away'>): Match => ({ court: 'Court 1', time: '18:00', homeScore: 0, awayScore: 0, sets: '', status: 'scheduled', ...values });
const tournament = (matches: Match[]): Tournament => ({ name: 'Test', dates: 'Today', format: 'Round robin', teams, matches, updatedAt: '' });

test('ranks by points, wins, score difference, then name', () => {
  const table = buildStandings(tournament([
    match({ id: 1, home: 1, away: 3, homeScore: 6, awayScore: 2, status: 'finished' }),
    match({ id: 2, home: 2, away: 3, homeScore: 6, awayScore: 4, status: 'finished' }),
  ]));
  assert.deepEqual(table.map(team => team.name), ['Alpha', 'Bravo', 'Charlie']);
  assert.equal(table[0].scoreDifference, 4);
  assert.equal(table[0].played, 1);
  assert.equal(table[0].won, 1);
  assert.equal(table[0].lost, 0);
  assert.equal(table[0].points, 3);
});

test('keeps every standings field at zero until a group match is finished', () => {
  const table = buildStandings(tournament([
    match({ id: 1, home: 1, away: 2, homeScore: 4, awayScore: 2, status: 'live' }),
    match({ id: 2, home: 1, away: 3, status: 'scheduled' }),
  ]));
  const alpha = table.find(team => team.id === 1)!;
  assert.deepEqual({ played: alpha.played, won: alpha.won, lost: alpha.lost, scoreFor: alpha.scoreFor, scoreAgainst: alpha.scoreAgainst, scoreDifference: alpha.scoreDifference, points: alpha.points }, { played: 0, won: 0, lost: 0, scoreFor: 0, scoreAgainst: 0, scoreDifference: 0, points: 0 });
});

test('ignores a finished match that still has an empty 0-0 result', () => {
  const alpha = buildStandings(tournament([match({ id: 1, home: 1, away: 2, status: 'finished', sets: '0-0 placeholder' })])).find(team => team.id === 1)!;
  assert.deepEqual({ played: alpha.played, won: alpha.won, lost: alpha.lost, points: alpha.points }, { played: 0, won: 0, lost: 0, points: 0 });
});

test('treats a missing legacy stage as group stage and handles team-relative results', () => {
  const result = teamMatchResult(match({ id: 1, home: 1, away: 2, homeScore: 3, awayScore: 6, status: 'finished' }), teams[1], teams);
  assert.equal(result.stage, 'Group stage');
  assert.equal(result.result, 'win');
  assert.equal(result.scoreFor, 6);
});

test('identifies champion and runner-up from a finished final', () => {
  const event = tournament([match({ id: 1, stage: 'Final', home: 1, away: 2, homeScore: 6, awayScore: 4, status: 'finished' })]);
  assert.equal(buildTeamJourney(event, teams[0]).status, 'Champion');
  assert.equal(buildTeamJourney(event, teams[1]).status, 'Runner-up');
  assert.equal(buildTeamJourney(event, teams[0]).stages[3].state, 'champion');
});

test('marks knockout loss as eliminated and keeps live participant active', () => {
  const finished = tournament([match({ id: 1, stage: 'Quarter-final', home: 1, away: 2, homeScore: 3, awayScore: 6, status: 'finished' })]);
  assert.equal(buildTeamJourney(finished, teams[0]).stages[1].state, 'eliminated');
  const live = tournament([match({ id: 2, stage: 'Semi-final', home: 1, away: 2, homeScore: 2, awayScore: 1, status: 'live' })]);
  assert.equal(buildTeamJourney(live, teams[0]).stages[2].state, 'active');
});

test('infers elimination when a later stage exists without the team', () => {
  const event = tournament([
    match({ id: 1, stage: 'Quarter-final', home: 1, away: 2, homeScore: 6, awayScore: 3, status: 'finished' }),
    match({ id: 2, stage: 'Semi-final', home: 2, away: 3, status: 'scheduled' }),
  ]);
  const journey = buildTeamJourney(event, teams[0]);
  assert.equal(journey.status, 'Eliminated after Quarter-final');
  assert.equal(journey.stages[1].state, 'eliminated');
});

test('keeps friendlies separate from rankings and progression', () => {
  const event = tournament([match({ id: 1, stage: 'Friendly', home: 1, away: 2, homeScore: 10, awayScore: 0, status: 'finished' })]);
  assert.equal(buildStandings(event)[0].scoreFor, 0);
  const journey = buildTeamJourney(event, teams[0]);
  assert.equal(journey.matches.length, 0);
  assert.equal(journey.friendlies.length, 1);
});

test('shows draw without treating it as elimination', () => {
  const event = tournament([match({ id: 1, stage: 'Quarter-final', home: 1, away: 2, homeScore: 4, awayScore: 4, status: 'finished' })]);
  assert.equal(buildTeamJourney(event, teams[0]).matches[0].result, 'draw');
  assert.notEqual(buildTeamJourney(event, teams[0]).stages[1].state, 'eliminated');
});

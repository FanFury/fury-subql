import { Stake, Club } from '../types';
import { TerraMessage } from '@subql/types-terra';
import { MsgExecuteContract } from '@terra-money/terra.js';

export async function handleMessage(
  msg: TerraMessage<MsgExecuteContract>
): Promise<void> {
  if (msg.tx.tx.code || msg.tx.tx.codespace) return;
  if (!Array.isArray(JSON.parse(msg.tx.tx.raw_log))) return;
  logger.info(JSON.stringify(msg.msg.toData().execute_msg));
  const data: any = msg.msg.toData().execute_msg;
  const key = Object.keys(data)[0];
  let clubName: string;
  let sport: string;
  let clubId: string;
  let stakeId: string;
  let stake: Stake;
  let club: Club;
  switch (key) {
    case 'assign_a_club':
      clubName = data?.assign_a_club?.club_name.split(' - ')?.[0];
      sport = data?.assign_a_club?.club_name.split(' - ')?.[1] || 'Football';
      clubId = `${clubName} - ${sport}`;
      const owner = data?.assign_a_club?.buyer;
      club = await Club.get(clubId);
      if (!club) {
        club = new Club(clubId);
        club.owner = owner;
        club.sport = sport;
        club.club_name = clubId;
      }
      await club.save();
      break;
    case 'stake_on_a_club':
      clubId = `${data.stake_on_a_club.club_name} - Football`;
      stakeId = `${data.stake_on_a_club.staker}-${clubId}`;
      await addStake(stakeId, {
        clubId,
        stakerAddress: data.stake_on_a_club.staker,
        amount: data.stake_on_a_club.amount,
      });
      break;
    case 'stake_withdraw_from_a_club':
      if (data.stake_withdraw_from_a_club.immediate_withdrawal === false) {
        stakeId = `${data.stake_withdraw_from_a_club.staker}-${data.stake_withdraw_from_a_club.club_name} - Football`;
        stake = await Stake.get(stakeId);
        if (stake) {
          stake.amount -= BigInt(data.stake_withdraw_from_a_club.amount);
          await stake.save();
        }
      }
      break;
    case 'release_club':
      clubName = data?.assign_a_club?.club_name.split(' - ')?.[0];
      sport = data?.assign_a_club?.club_name.split(' - ')?.[1] || 'Football';
      clubId = `${clubName} - ${sport}`;
      club = await Club.get(clubId);
      if (club) {
        club.owner = null;
      }
      await club.save();
      break;
    case 'assign_stakes_to_a_club':
      clubName = data?.assign_stakes_to_a_club?.club_name.split(' - ')?.[0];
      sport =
        data?.assign_stakes_to_a_club?.club_name.split(' - ')?.[1] ||
        'Football';
      clubId = `${clubName} - ${sport}`;
      const stakeList = data?.assign_stakes_to_a_club?.stake_list;
      stakeList.forEach(async (s) => {
        stakeId = `${s.staker_address}-${clubId}`;
        await addStake(stakeId, {
          clubId,
          stakerAddress: s.staker_address,
          amount: s.staked_amount,
        });
      });
      break;
    default:
  }
}

const addStake = async (stakeId, { clubId, stakerAddress, amount }) => {
  let stake = await Stake.get(stakeId);
  if (!stake) {
    stake = new Stake(stakeId);
    stake.clubId = clubId;
    stake.staker = stakerAddress;
    stake.amount = BigInt(0);
  }
  stake.amount += BigInt(amount);
  await stake.save();
};

export async function handleBlockMessage(
  msg: TerraMessage<MsgExecuteContract>
): Promise<void> {
  if (msg.tx.tx.code || msg.tx.tx.codespace) return;
  if (!Array.isArray(JSON.parse(msg.tx.tx.raw_log))) return;
  logger.info(JSON.stringify(msg.msg.toData().execute_msg));
}
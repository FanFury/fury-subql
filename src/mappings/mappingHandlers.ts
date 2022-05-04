import { Stake, Club, FuryUstMapping } from '../types';
import { TerraMessage, TerraBlock, TerraTransaction } from '@subql/types-terra';
import { LCDClient, MsgExecuteContract, AccAddress } from '@terra-money/terra.js';
import { time } from 'console';
import { fips } from 'crypto';
import axios from 'axios'
import { nanoid } from 'nanoid'
import { AxiosResponse } from 'axios'

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


export async function handleBlockMessage(block: TerraBlock): Promise<void> {
  //const record = new Block(block.block.block_id.hash);
  //record.height = BigInt(block.block.block.header.height);
  // logger.info("Block message received: ############################");
  // logger.info(JSON.stringify(block.block));
  let url = "https://fcd.terra.dev/v1/bank/terra1jfuq655fmqp7uhkkqanmljqj26r9acs68drn2s"
  let usdNo = await getUSD(url)
  /*
  const terraClient = new LCDClient({
    "URL": "https://lcd.terra.dev",
    "chainID": "columbus-5"
  });
  */
  let mintingCtrctAddress = "terra1cdc6nlsx0l6jmt3nnx7gxjggf902wge3n2z76k"
  let liquidityCtrctAddress = "terra1jfuq655fmqp7uhkkqanmljqj26r9acs68drn2s"
  //let furyNo: number = await getFury(terraClient, mintingCtrctAddress, liquidityCtrctAddress)
  let furyNo: number = 8000000
  let furyUsdMapRec = new FuryUstMapping(nanoid());
  furyUsdMapRec.date = new Date()
  furyUsdMapRec.fury = furyNo
  furyUsdMapRec.usd = usdNo
  logger.info("mapping : " + furyNo + " , usd : " + usdNo);
  await furyUsdMapRec.save();
}

type UsdBalanceInfo = {
  "denom": string,
  "available": string,
  "delegatedVesting": string,
  "delegatable": string,
  "freedVesting": string,
  "unbonding": string,
  "remainingVesting": string
}

type GetUsdResponse = {
  balance: UsdBalanceInfo[],
  vesting: string[],
  delegations: string[],
  unbondings: string[]
}


async function getUSD(url): Promise<number> {
  try {
    let response: AxiosResponse<GetUsdResponse> = await axios.get<GetUsdResponse>(url)
    logger.info("axios get : " + JSON.stringify(response));
    return Promise.resolve(100)
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error("axios get : " + JSON.stringify(error.message));
    } else {
      logger.error("axios get : " + JSON.stringify(error));
    }
  }
}

async function getFury(terraClient: LCDClient, mintingCtrctAddress: AccAddress, liquidityCtrctAddress: AccAddress): Promise<number> {
  try {
    let response: number = await terraClient.wasm.contractQuery(mintingCtrctAddress, { "balance": { "address": liquidityCtrctAddress } })
    logger.info("contractQuery get : " + response);
    return Promise.resolve(response / 1000000)
  } catch (error) {
    logger.error(error);
  }
  logger.info("completed");
}

export async function handleTransactionMessage(tx: TerraTransaction): Promise<void> {
  //const record = new Transaction(tx.tx.txhash);
  //record.blockHeight = BigInt(tx.block.block.block.header.height);
  //record.timestamp = tx.tx.timestamp;
  logger.info("Transcation message received: ############################");
  logger.info(JSON.stringify(tx.tx));
  //await record.save();
}
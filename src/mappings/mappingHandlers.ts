import { Stake } from "../types";
import {
  TerraEvent,
  TerraBlock,
  TerraMessage,
  TerraTransaction,
} from "@subql/types-terra";
import { MsgExecuteContract } from "@terra-money/terra.js";

// interface Stake {
//   stake_on_a_club: {
//     staker: string,
//     among: string,
//     club_name: string,
//   }
// }

// export async function handleBlock(block: TerraBlock): Promise<void> {
//   const record = new Block(block.block.block_id.hash);
//   record.height = BigInt(block.block.block.header.height);
//   await record.save();
// }

// export async function handleTransaction(tx: TerraTransaction): Promise<void> {
//   const record = new Transaction(tx.tx.txhash);
//   record.blockHeight = BigInt(tx.block.block.block.header.height);
//   record.timestamp = tx.tx.timestamp;
//   await record.save();
// }

export async function handleMessage(
  msg: TerraMessage<MsgExecuteContract>
): Promise<void> {
  logger.info(JSON.stringify(msg.msg.toData().execute_msg));
  const data: any = msg.msg.toData().execute_msg;
  const key = Object.keys(data)[0];
  if (key === "stake_on_a_club") {
    const id = `${data.stake_on_a_club.staker}-${data.stake_on_a_club.club_name}`;
    let record = await Stake.get(id);
    if (!record) {
      record = new Stake(id);
      record.club = data.stake_on_a_club.club_name;
      record.spender = data.stake_on_a_club.staker;
      record.stake = BigInt(0);
    }
    record.stake += BigInt(data.stake_on_a_club.amount);
    await record.save();
  }
  // const record = new Message(`${msg.tx.tx.txhash}-${msg.idx}`);
  // record.blockHeight = BigInt(msg.block.block.block.header.height);
  // record.txHash = msg.tx.tx.txhash;
  // record.contract = msg.msg.toData().contract;
  // record.sender = msg.msg.toData().sender;
  // record.executeMsg = JSON.stringify(msg.msg.toData().execute_msg);
  // await record.save();
}

// export async function handleEvent(
//   event: TerraEvent<MsgExecuteContract>
// ): Promise<void> {
//   const record = new TransferEvent(
//     `${event.tx.tx.txhash}-${event.msg.idx}-${event.idx}`
//   );
//   record.blockHeight = BigInt(event.block.block.block.header.height);
//   record.txHash = event.tx.tx.txhash;
//   for (const attr of event.event.attributes) {
//     switch (attr.key) {
//       case "sender":
//         record.sender = attr.value;
//         break;
//       case "recipient":
//         record.recipient = attr.value;
//         break;
//       case "amount":
//         record.amount = attr.value;
//         break;
//       default:
//     }
//   }
//   await record.save();
// }

import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import {
	Claim as ClaimEvent,
	DepositRewards as DepositRewardsEvent,
	WeightsUpdate as WeightsUpdateEvent,
} from "../generated/ScoreGague/ScoreGague";
import { Claim, DepositRewards, WeightsUpdate } from "../generated/schema";

export function handleClaim(event: ClaimEvent): void {
	const entity = new Claim(
		event.transaction.hash.concatI32(event.logIndex.toI32())
	);
	entity.epoch = event.params.epoch;
	entity.userReward = event.params.userReward;
	entity.user = event.params.user;
	entity.receiver = event.params.receiver;

	entity.blockNumber = event.block.number;
	entity.blockTimestamp = event.block.timestamp;
	entity.transactionHash = event.transaction.hash;

	entity.save();
}

export function handleDepositRewards(event: DepositRewardsEvent): void {
	const entity = new DepositRewards(
		event.transaction.hash.concatI32(event.logIndex.toI32())
	);
	let cashPricePercent = event.params.amount
		.times(BigInt.fromI32(80))
		.div(BigInt.fromI32(100));
	let teamFundPercent = event.params.amount
		.times(BigInt.fromI32(20))
		.div(BigInt.fromI32(100));

	entity.cashPrize = event.params.amount.minus(cashPricePercent);
	entity.teamFund = event.params.amount.minus(teamFundPercent);
	entity.amount = event.params.amount;

	entity.blockNumber = event.block.number;
	entity.blockTimestamp = event.block.timestamp;
	entity.transactionHash = event.transaction.hash;

	entity.save();
}

export function handleWeightsUpdate(event: WeightsUpdateEvent): void {
	const entity = new WeightsUpdate(
		event.transaction.hash.concatI32(event.logIndex.toI32())
	);
	entity.profitWeight = event.params.profitWeight;
	entity.volumeWeight = event.params.volumeWeight;

	entity.blockNumber = event.block.number;
	entity.blockTimestamp = event.block.timestamp;
	entity.transactionHash = event.transaction.hash;

	entity.save();
}

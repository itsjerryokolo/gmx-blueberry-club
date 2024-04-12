import { Value, log, store } from "@graphprotocol/graph-ts";
import { EventLog1, EventLog2 } from "../generated/EventEmitter/EventEmitter";
import {
	OrderCollateralDeltaAmountAutoUpdated,
	OrderCreated,
	OrderSizeDeltaAutoUpdated,
	PositionLink,
	PositionOpen,
	ReferralAccount,
	PriceCandle,
	PriceCandleSeed,
	ReferralPositionID,
} from "../generated/schema";
import * as dto from "./common/dto";
import {
	IntervalUnixTime,
	OrderExecutionStatus,
	ZERO_BI,
} from "./common/const";
import {
	getAddressItem,
	getAddressItemList,
	getBoolItem,
	getBytes32Item,
	getStringItem,
	getUintItem,
} from "./common/datastore";
import { getIdFromEvent } from "./common/utils";
import { OpenPosition } from "../generated/Orchestrator/Orchestrator";

export function handleEventLog1(event: EventLog1): void {
	if (event.params.eventName == "OraclePriceUpdate") {
		onOraclePriceUpdate(event);
	} else if (event.params.eventName == "PositionIncrease") {
		onPositionIncrease(event);
	} else if (event.params.eventName == "PositionDecrease") {
		onPositionDecrease(event);
	} else if (event.params.eventName == "PositionFeesCollected") {
		onPositionFeesInfo(event);
	} else if (event.params.eventName == "PositionFeesInfo") {
		onPositionFeesInfo(event);
	} else if (
		event.params.eventName == "OrderCollateralDeltaAmountAutoUpdated"
	) {
		onOrderCollateralDeltaAmountAutoUpdated(event);
	} else if (event.params.eventName == "OrderSizeDeltaAutoUpdated") {
		onOrderSizeDeltaAutoUpdated(event);
	} else if (event.params.eventName == "MarketCreated") {
		const marketCreated = dto.createMarketCreated(event);
		marketCreated.save();
	}
}

export function handleEventLog2(event: EventLog2): void {
	if (event.params.eventName == "OrderCreated") {
		onOrderCreated(event);
	} else if (event.params.eventName == "OrderCancelled") {
		onOrderCancelled(event);
	} else if (event.params.eventName == "OrderFrozen") {
		onOrderFrozen(event);
	}
}

function onOrderCreated(event: EventLog2): void {
	let referralAccount = ReferralAccount.load(
		getAddressItem(event.params.eventData, 0)
	);
	if (!referralAccount) return;

	const keyId = getBytes32Item(event.params.eventData, 0);
	const orderCreated = new OrderCreated(keyId);

	let referralPosition = ReferralPositionID.load(
		referralAccount.id.toHexString()
	);
	if (referralPosition) {
		referralPosition = new ReferralPositionID(referralAccount.id.toHexString());
		referralPosition.keyID = keyId;
		referralPosition.isOpen = true;
		referralPosition.referralAccount = referralAccount.id;

		referralPosition.save();
	}

	orderCreated.account = getAddressItem(event.params.eventData, 0);
	orderCreated.receiver = getAddressItem(event.params.eventData, 1);
	orderCreated.callbackContract = getAddressItem(event.params.eventData, 2);
	orderCreated.uiFeeReceiver = getAddressItem(event.params.eventData, 3);
	orderCreated.market = getAddressItem(event.params.eventData, 4);
	orderCreated.initialCollateralToken = getAddressItem(
		event.params.eventData,
		5
	);

	orderCreated.swapPath = Value.fromAddressArray(
		getAddressItemList(event.params.eventData, 0)
	).toBytesArray();

	orderCreated.orderType = getUintItem(event.params.eventData, 0).toI32();
	orderCreated.decreasePositionSwapType = getUintItem(
		event.params.eventData,
		1
	);
	orderCreated.sizeDeltaUsd = getUintItem(event.params.eventData, 2);
	orderCreated.initialCollateralDeltaAmount = getUintItem(
		event.params.eventData,
		3
	);
	orderCreated.triggerPrice = getUintItem(event.params.eventData, 4);
	orderCreated.acceptablePrice = getUintItem(event.params.eventData, 5);
	orderCreated.executionFee = getUintItem(event.params.eventData, 6);
	orderCreated.callbackGasLimit = getUintItem(event.params.eventData, 7);
	orderCreated.minOutputAmount = getUintItem(event.params.eventData, 8);
	orderCreated.updatedAtBlock = getUintItem(event.params.eventData, 9);

	orderCreated.isLong = getBoolItem(event.params.eventData, 0);
	orderCreated.shouldUnwrapNativeToken = getBoolItem(event.params.eventData, 1);
	orderCreated.isFrozen = getBoolItem(event.params.eventData, 2);

	orderCreated.key = keyId;

	orderCreated.save();
}

function onOrderSizeDeltaAutoUpdated(event: EventLog1): void {
	const orderSizeDeltaAutoUpdated = new OrderSizeDeltaAutoUpdated(
		getIdFromEvent(event)
	);

	orderSizeDeltaAutoUpdated.key = getBytes32Item(event.params.eventData, 0);
	orderSizeDeltaAutoUpdated.sizeDeltaUsd = getUintItem(
		event.params.eventData,
		0
	);
	orderSizeDeltaAutoUpdated.nextSizeDeltaUsd = getUintItem(
		event.params.eventData,
		1
	);

	orderSizeDeltaAutoUpdated.save();
}

function onOrderCollateralDeltaAmountAutoUpdated(event: EventLog1): void {
	const orderCollateralDeltaAmountAutoUpdated =
		new OrderCollateralDeltaAmountAutoUpdated(getIdFromEvent(event));

	orderCollateralDeltaAmountAutoUpdated.key = getBytes32Item(
		event.params.eventData,
		0
	);
	orderCollateralDeltaAmountAutoUpdated.collateralDeltaAmount = getUintItem(
		event.params.eventData,
		0
	);
	orderCollateralDeltaAmountAutoUpdated.nextCollateralDeltaAmount = getUintItem(
		event.params.eventData,
		1
	);

	orderCollateralDeltaAmountAutoUpdated.save();
}

function onOrderCancelled(event: EventLog2): void {
	const orderId = getBytes32Item(event.params.eventData, 0);
	const orderCreated = OrderCreated.load(orderId);

	if (orderCreated === null) {
		log.error("OrderCreated not found", []);
		return;
	}

	const message = getStringItem(event.params.eventData, 0);
	const orderStatus = dto.createOrderStatus(
		event,
		orderCreated,
		orderCreated.key,
		OrderExecutionStatus.CANCELLED,
		message
	);
	orderStatus.save();
}

function onOrderFrozen(event: EventLog2): void {
	// const orderFrozen = new OrderCancelled(getIdFromEvent(event))
	// orderFrozen.key = getBytes32Item(event.params.eventData, 0)
	// orderFrozen.account = getAddressItem(event.params.eventData, 0)
	// orderFrozen.reason = getStringItem(event.params.eventData, 0)
	// orderFrozen.reasonBytes = getBytesItem(event.params.eventData, 0)
	// orderFrozen.save()

	const orderId = getBytes32Item(event.params.eventData, 0);
	const orderCreated = OrderCreated.load(orderId);

	if (orderCreated === null) {
		log.error("OrderCreated not found", []);
		return;
	}

	const message = getStringItem(event.params.eventData, 0);
	const uniqueOrderId = orderCreated.key.concatI32(OrderExecutionStatus.FROZEN);
	const orderStatus = dto.createOrderStatus(
		event,
		orderCreated,
		uniqueOrderId,
		OrderExecutionStatus.FROZEN,
		message
	);

	orderStatus.save();
}

function onPositionIncrease(event: EventLog1): void {
	const orderId = getBytes32Item(event.params.eventData, 0);
	const orderCreated = OrderCreated.load(orderId);

	if (orderCreated === null) {
		log.error("OrderCreated not found", []);
		return;
	}

	const orderStatus = dto.createOrderStatus(
		event,
		orderCreated,
		orderCreated.key,
		OrderExecutionStatus.EXECUTED
	);
	const positionIncrease = dto.createPositionIncrease(event, orderStatus);

	let openSlot = PositionOpen.load(positionIncrease.positionKey.toHex());
	if (openSlot === null) {
		openSlot = dto.initPositionOpen(event, positionIncrease);
	}

	let positionLink = PositionLink.load(openSlot.link);

	if (positionLink === null) {
		positionLink = new PositionLink(positionIncrease.orderKey);
		positionLink.key = openSlot.key;
		positionLink.save();
	}

	positionIncrease.link = positionIncrease.orderKey;

	const collateralUsd = positionIncrease.collateralAmount.times(
		positionIncrease.collateralTokenPriceMax
	);

	openSlot.sizeInUsd = positionIncrease.sizeInUsd;
	openSlot.sizeInTokens = positionIncrease.sizeInTokens;
	openSlot.collateralAmount = positionIncrease.collateralAmount;

	openSlot.cumulativeSizeUsd = openSlot.cumulativeSizeUsd.plus(
		positionIncrease.sizeDeltaUsd
	);
	openSlot.cumulativeSizeToken = openSlot.cumulativeSizeToken.plus(
		positionIncrease.sizeDeltaInTokens
	);
	openSlot.cumulativeCollateralUsd =
		openSlot.cumulativeCollateralUsd.plus(collateralUsd);
	openSlot.cumulativeCollateralToken = openSlot.cumulativeCollateralToken.plus(
		positionIncrease.collateralAmount
	);

	openSlot.maxSizeUsd = openSlot.maxSizeUsd.gt(openSlot.sizeInUsd)
		? openSlot.maxSizeUsd
		: openSlot.sizeInUsd;
	openSlot.maxSizeToken = openSlot.maxSizeToken.gt(openSlot.maxSizeToken)
		? openSlot.maxSizeToken
		: openSlot.maxSizeToken;
	openSlot.maxCollateralToken = openSlot.maxCollateralToken.gt(
		openSlot.collateralAmount
	)
		? openSlot.maxCollateralToken
		: openSlot.collateralAmount;
	openSlot.maxCollateralUsd = openSlot.maxCollateralUsd.gt(collateralUsd)
		? openSlot.maxCollateralUsd
		: collateralUsd;

	let referralAccount = ReferralAccount.load(openSlot.account);
	if (referralAccount) {
		openSlot.referralAccount = referralAccount.id;
		openSlot.referralMember = true;
		referralAccount.save();
	}

	openSlot.save();
	positionIncrease.save();
	orderStatus.save();
}

function onPositionDecrease(event: EventLog1): void {
	const orderId = getBytes32Item(event.params.eventData, 0);
	const orderCreated = OrderCreated.load(orderId);

	if (orderCreated === null) {
		log.error("OrderCreated not found", []);
		return;
	}

	const orderStatus = dto.createOrderStatus(
		event,
		orderCreated,
		orderCreated.key,
		OrderExecutionStatus.EXECUTED
	);
	const positionDecrease = dto.createPositionDecrease(event, orderStatus);

	const positionKey = getBytes32Item(event.params.eventData, 1);
	const openPosition = PositionOpen.load(positionKey.toHex());

	if (openPosition === null) {
		log.warning("PositionOpen not found", []);
		return;
	}

	positionDecrease.link = openPosition.link;

	if (positionDecrease.sizeInTokens.gt(ZERO_BI)) {
		openPosition.sizeInUsd = positionDecrease.sizeInUsd;
		openPosition.sizeInTokens = positionDecrease.sizeInTokens;
		openPosition.collateralAmount = positionDecrease.collateralAmount;
		openPosition.realisedPnlUsd = openPosition.realisedPnlUsd.plus(
			positionDecrease.basePnlUsd
		);
		openPosition.save();
	} else {
		openPosition.realisedPnlUsd = openPosition.realisedPnlUsd.plus(
			positionDecrease.basePnlUsd
		);

		const positionSettled = dto.createPositionSettled(
			event,
			openPosition,
			orderId
		);

		let referralAccount = ReferralAccount.load(positionSettled.account);
		if (referralAccount) {
			positionSettled.referralAccount = referralAccount.id;
			referralAccount.save();
		}

		positionSettled.save();

		store.remove("PositionOpen", openPosition.id);
	}

	orderStatus.save();
	positionDecrease.save();
}

function onPositionFeesInfo(event: EventLog1): void {
	const positionFeeUpdate = dto.createPositionFeesCollected(event);
	const existingLink = PositionLink.load(positionFeeUpdate.orderKey);

	positionFeeUpdate.link =
		existingLink === null ? positionFeeUpdate.orderKey : existingLink.id;
	positionFeeUpdate.save();
}

export const PRICEFEED_INTERVAL_LIST = [
	IntervalUnixTime.MIN5,
	IntervalUnixTime.MIN15,
	IntervalUnixTime.MIN60,
	IntervalUnixTime.HR6,
	IntervalUnixTime.HR24,
	IntervalUnixTime.DAY7,
	IntervalUnixTime.MONTH,
];

function onOraclePriceUpdate(event: EventLog1): void {
	const token = getAddressItem(event.params.eventData, 0);
	const price = getUintItem(event.params.eventData, 1);
	const timestamp = getUintItem(event.params.eventData, 2).toI32();

	for (let index = 0; index < PRICEFEED_INTERVAL_LIST.length; index++) {
		const interval = PRICEFEED_INTERVAL_LIST[index];
		const nextSlot = timestamp / interval;
		const nextTimeSlot = nextSlot * interval;
		const latestId = `${token.toHex()}:${interval}`;

		let latest = PriceCandleSeed.load(latestId);

		// initialize latest price
		if (latest === null) {
			latest = new PriceCandleSeed(latestId);
			latest.timestamp = nextTimeSlot;
			latest.token = token;
			latest.interval = interval;
			latest.o = price;
			latest.h = price;
			latest.l = price;
			latest.c = price;
			latest.save();

			return;
		}

		if (nextTimeSlot > latest.timestamp) {
			// store previous candle and initialize next candle
			const candleId = `${latest.token.toHex()}:${interval}:${
				latest.timestamp
			}`;
			const candle = new PriceCandle(candleId);

			candle.token = latest.token;
			candle.interval = latest.interval;
			candle.timestamp = latest.timestamp;
			candle.o = latest.o;
			candle.h = latest.h;
			candle.l = latest.l;
			candle.c = latest.c;
			candle.save();

			// next candle
			latest.timestamp = nextTimeSlot as i32;
			latest.o = price;
			latest.h = price;
			latest.l = price;
		} else {
			if (price.gt(latest.h)) {
				latest.h = price;
			} else if (price.lt(latest.l)) {
				latest.l = price;
			}
		}

		latest.c = price;

		latest.save();
	}
}

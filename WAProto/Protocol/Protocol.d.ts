import * as $protobuf from "protobufjs";
import Long = require("long");
/** Namespace Protocol. */
export namespace Protocol {

    /** Properties of a LimitSharing. */
    interface ILimitSharing {

        /** LimitSharing sharingLimited */
        sharingLimited?: (boolean|null);

        /** LimitSharing trigger */
        trigger?: (Protocol.LimitSharing.TriggerType|null);

        /** LimitSharing limitSharingSettingTimestamp */
        limitSharingSettingTimestamp?: (number|Long|null);

        /** LimitSharing initiatedByMe */
        initiatedByMe?: (boolean|null);
    }

    /** Represents a LimitSharing. */
    class LimitSharing implements ILimitSharing {

        /**
         * Constructs a new LimitSharing.
         * @param [properties] Properties to set
         */
        constructor(properties?: Protocol.ILimitSharing);

        /** LimitSharing sharingLimited. */
        public sharingLimited?: (boolean|null);

        /** LimitSharing trigger. */
        public trigger?: (Protocol.LimitSharing.TriggerType|null);

        /** LimitSharing limitSharingSettingTimestamp. */
        public limitSharingSettingTimestamp?: (number|Long|null);

        /** LimitSharing initiatedByMe. */
        public initiatedByMe?: (boolean|null);

        /** LimitSharing _sharingLimited. */
        public _sharingLimited?: "sharingLimited";

        /** LimitSharing _trigger. */
        public _trigger?: "trigger";

        /** LimitSharing _limitSharingSettingTimestamp. */
        public _limitSharingSettingTimestamp?: "limitSharingSettingTimestamp";

        /** LimitSharing _initiatedByMe. */
        public _initiatedByMe?: "initiatedByMe";

        /**
         * Creates a new LimitSharing instance using the specified properties.
         * @param [properties] Properties to set
         * @returns LimitSharing instance
         */
        public static create(properties?: Protocol.ILimitSharing): Protocol.LimitSharing;

        /**
         * Encodes the specified LimitSharing message. Does not implicitly {@link Protocol.LimitSharing.verify|verify} messages.
         * @param message LimitSharing message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: Protocol.ILimitSharing, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified LimitSharing message, length delimited. Does not implicitly {@link Protocol.LimitSharing.verify|verify} messages.
         * @param message LimitSharing message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: Protocol.ILimitSharing, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a LimitSharing message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns LimitSharing
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): Protocol.LimitSharing;

        /**
         * Decodes a LimitSharing message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns LimitSharing
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): Protocol.LimitSharing;

        /**
         * Verifies a LimitSharing message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a LimitSharing message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns LimitSharing
         */
        public static fromObject(object: { [k: string]: any }): Protocol.LimitSharing;

        /**
         * Creates a plain object from a LimitSharing message. Also converts values to other types if specified.
         * @param message LimitSharing
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: Protocol.LimitSharing, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this LimitSharing to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for LimitSharing
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace LimitSharing {

        /** TriggerType enum. */
        enum TriggerType {
            UNKNOWN = 0,
            CHAT_SETTING = 1,
            BIZ_SUPPORTS_FB_HOSTING = 2,
            UNKNOWN_GROUP = 3
        }
    }

    /** Properties of a MessageKey. */
    interface IMessageKey {

        /** MessageKey remoteJid */
        remoteJid?: (string|null);

        /** MessageKey fromMe */
        fromMe?: (boolean|null);

        /** MessageKey id */
        id?: (string|null);

        /** MessageKey participant */
        participant?: (string|null);

        /** MessageKey remoteLid */
        remoteLid?: (number|Long|null);

        /** MessageKey participantLid */
        participantLid?: (number|Long|null);

        /** MessageKey isLidMessage */
        isLidMessage?: (boolean|null);
    }

    /** Represents a MessageKey. */
    class MessageKey implements IMessageKey {

        /**
         * Constructs a new MessageKey.
         * @param [properties] Properties to set
         */
        constructor(properties?: Protocol.IMessageKey);

        /** MessageKey remoteJid. */
        public remoteJid?: (string|null);

        /** MessageKey fromMe. */
        public fromMe?: (boolean|null);

        /** MessageKey id. */
        public id?: (string|null);

        /** MessageKey participant. */
        public participant?: (string|null);

        /** MessageKey remoteLid. */
        public remoteLid?: (number|Long|null);

        /** MessageKey participantLid. */
        public participantLid?: (number|Long|null);

        /** MessageKey isLidMessage. */
        public isLidMessage?: (boolean|null);

        /** MessageKey _remoteJid. */
        public _remoteJid?: "remoteJid";

        /** MessageKey _fromMe. */
        public _fromMe?: "fromMe";

        /** MessageKey _id. */
        public _id?: "id";

        /** MessageKey _participant. */
        public _participant?: "participant";

        /** MessageKey _remoteLid. */
        public _remoteLid?: "remoteLid";

        /** MessageKey _participantLid. */
        public _participantLid?: "participantLid";

        /** MessageKey _isLidMessage. */
        public _isLidMessage?: "isLidMessage";

        /**
         * Creates a new MessageKey instance using the specified properties.
         * @param [properties] Properties to set
         * @returns MessageKey instance
         */
        public static create(properties?: Protocol.IMessageKey): Protocol.MessageKey;

        /**
         * Encodes the specified MessageKey message. Does not implicitly {@link Protocol.MessageKey.verify|verify} messages.
         * @param message MessageKey message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: Protocol.IMessageKey, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified MessageKey message, length delimited. Does not implicitly {@link Protocol.MessageKey.verify|verify} messages.
         * @param message MessageKey message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: Protocol.IMessageKey, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a MessageKey message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns MessageKey
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): Protocol.MessageKey;

        /**
         * Decodes a MessageKey message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns MessageKey
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): Protocol.MessageKey;

        /**
         * Verifies a MessageKey message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a MessageKey message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns MessageKey
         */
        public static fromObject(object: { [k: string]: any }): Protocol.MessageKey;

        /**
         * Creates a plain object from a MessageKey message. Also converts values to other types if specified.
         * @param message MessageKey
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: Protocol.MessageKey, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this MessageKey to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for MessageKey
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a LIDMessageKey. */
    interface ILIDMessageKey {

        /** LIDMessageKey remoteLid */
        remoteLid?: (number|Long|null);

        /** LIDMessageKey fromMe */
        fromMe?: (boolean|null);

        /** LIDMessageKey id */
        id?: (string|null);

        /** LIDMessageKey participantLid */
        participantLid?: (number|Long|null);

        /** LIDMessageKey remoteJid */
        remoteJid?: (string|null);

        /** LIDMessageKey participant */
        participant?: (string|null);
    }

    /** Represents a LIDMessageKey. */
    class LIDMessageKey implements ILIDMessageKey {

        /**
         * Constructs a new LIDMessageKey.
         * @param [properties] Properties to set
         */
        constructor(properties?: Protocol.ILIDMessageKey);

        /** LIDMessageKey remoteLid. */
        public remoteLid?: (number|Long|null);

        /** LIDMessageKey fromMe. */
        public fromMe?: (boolean|null);

        /** LIDMessageKey id. */
        public id?: (string|null);

        /** LIDMessageKey participantLid. */
        public participantLid?: (number|Long|null);

        /** LIDMessageKey remoteJid. */
        public remoteJid?: (string|null);

        /** LIDMessageKey participant. */
        public participant?: (string|null);

        /**
         * Creates a new LIDMessageKey instance using the specified properties.
         * @param [properties] Properties to set
         * @returns LIDMessageKey instance
         */
        public static create(properties?: Protocol.ILIDMessageKey): Protocol.LIDMessageKey;

        /**
         * Encodes the specified LIDMessageKey message. Does not implicitly {@link Protocol.LIDMessageKey.verify|verify} messages.
         * @param message LIDMessageKey message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: Protocol.ILIDMessageKey, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified LIDMessageKey message, length delimited. Does not implicitly {@link Protocol.LIDMessageKey.verify|verify} messages.
         * @param message LIDMessageKey message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: Protocol.ILIDMessageKey, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a LIDMessageKey message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns LIDMessageKey
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): Protocol.LIDMessageKey;

        /**
         * Decodes a LIDMessageKey message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns LIDMessageKey
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): Protocol.LIDMessageKey;

        /**
         * Verifies a LIDMessageKey message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a LIDMessageKey message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns LIDMessageKey
         */
        public static fromObject(object: { [k: string]: any }): Protocol.LIDMessageKey;

        /**
         * Creates a plain object from a LIDMessageKey message. Also converts values to other types if specified.
         * @param message LIDMessageKey
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: Protocol.LIDMessageKey, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this LIDMessageKey to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for LIDMessageKey
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }
}

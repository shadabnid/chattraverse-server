import { TryCatch } from "../middleware/error.js";
import { ErrorHandler } from "../utils/utility.js";
import Chat from '../models/chat.js';
import { deleteFilesFromCloudinary, emitEvent, uploadFilesToCloudinary } from "../utils/features.js";
import { ALERT, NEW_ATTACHMENT, NEW_MESSAGE, NEW_MESSAGE_ALERT, REFETCH_CHATS } from "../constant/event.js";
import { getOtherMember } from "../lib/helper.js";
import User from "../models/users.js";
import Message from "../models/message.js";

const newGroup = TryCatch(async (req, res, next) => {
    const { name, members } = req.body;

    if (members.length < 2)
        return next(
            new ErrorHandler("Group chat must have at least 3 members", 400)
        );

    const allMembers = [...members, req.user];
    await Chat.create({
        name,
        groupchat: true,
        creator: req.user,
        members: allMembers,
    });
    emitEvent(req, ALERT, allMembers, `Welcome to ${name} group`);
    emitEvent(req, REFETCH_CHATS, members);
    return res.status(201).json({
        success: true,
        message: "Group Created",
    })
});

const getMyChats = TryCatch(async (req, res, next) => {
    const chats = await Chat.find({ members: req.user }).populate(
        "members",
        "name avatar",
    );

    const transformedChats = chats.map(({ _id, name, members, groupchat }) => {
        const otherMember = getOtherMember(members, req.user);
        return {
            _id,
            groupchat,
            avatar: groupchat ? members.slice(0, 3).map(({ avatar }) => avatar.url) : [otherMember.avatar.url],
            name: groupchat ? name : otherMember.name,
            members: members.reduce((prev, curr) => {
                if (curr._id.toString() !== req.user.toString())
                    prev.push(curr._id);
                return prev;
            }, [])

        }
    })
    return res.status(200).json({
        success: true,
        chats: transformedChats,
    })
});

const getMyGroups = TryCatch(async (req, res, next) => {
    const chats = await Chat.find({
        members: req.user,
        groupchat: true,
        creator: req.user,
    }).populate("members", "name avatar");
    
    const groups = chats.map(({ members, _id, groupchat, name }) => (
        {
            _id,
            groupchat,
            name,
            avatar: members.slice(0, 3).map(({ avatar }) => avatar.url),
        }
    ))
    return res.status(200).json({
        success: true,
        groups,
    })

});

const addMembers = TryCatch(async (req, res, next) => {

    const { chatId, members } = req.body;

    if (!members || members.length < 1) return next(new ErrorHandler("Please provide members", 400));

    const chat = await Chat.findById(chatId);

    if (!chat)
        return next(new ErrorHandler("Chat not found", 404));

    if (!chat.groupchat)
        return next(new ErrorHandler("This is not groupchat", 400));

    if (chat.creator.toString() !== req.user.toString())
        return next(new ErrorHandler("You are not allowed to add members", 403));

    const allNewMembersPromise = members.map((i) => User.findById(i, "name"));


    const allNewMembers = await Promise.all(allNewMembersPromise);
    

    const uniqueMembers = allNewMembers
        .filter((i) => !chat.members.includes(i._id.toString()))
        .map((i) => i._id)

    chat.members.push(...uniqueMembers);

    if (chat.members.length > 100)
        return next(new ErrorHandler("Group members limit reached", 400));

    await chat.save();

    const allUsersName = allNewMembers.map((i) => i.name).join(",");

    emitEvent(
        req,
        ALERT,
        chat.members,
        `${allUsersName} has been added in the group`
    )
    emitEvent(req, REFETCH_CHATS, chat.members);

    return res.status(200).json({
        success: true,
        message: "Members added successfully",
    })


});

const removeMembers = TryCatch(async (req, res, next) => {
    const { userId, chatId } = req.body;

    console.log(userId);
    const [chat, userThatwillBeRemoved] = await Promise.all([Chat.findById(chatId), User.findById(userId, "name")]);


    if (!chat)
        return next(new ErrorHandler("Chat not found", 404));

    if (!chat.groupchat)
        return next(new ErrorHandler("This is not groupchat", 400));

    if (chat.creator.toString() !== req.user.toString())
        return next(new ErrorHandler("You are not allowed to add members", 403));

    if (chat.members.length <= 3)
        return next(new ErrorHandler("Group must have atleast 3 members", 400));

    chat.members = chat.members.filter(
        (member) => member.toString() !== userId.toString()
    );
    await chat.save();
    emitEvent(
        req,
        ALERT,
        chat.members,
        `${userThatwillBeRemoved.name} has been removed from the group`
    )
    emitEvent(req, REFETCH_CHATS, chat.members);
    return res.status(200).json({
        success: true,
        message: "Member removed successfully"
    })
});

const leaveGroup = TryCatch(async (req, res, next) => {
    const chatId = req.params.id;
    const chat = await Chat.findById(chatId);

    if (!chat)
        return next(new ErrorHandler("Chat not found", 404));

    if (!chat.groupchat)
        return next(new ErrorHandler("This is not groupchat", 400));

    const remainingMembers = chat.members.filter((member) =>
        member.toString() !== req.user.toString()
    );

    if (chat.creator.toString() === req.user.toString()) {
        const randomElement = Math.floor(Math.random() * remainingMembers.length);
        const newCreator = remainingMembers[randomElement];
        chat.creator = newCreator;
    }

    chat.members = remainingMembers;

    const user = await User.findById(req.user, "name");
    await chat.save();

    emitEvent(
        req,
        ALERT,
        chat.members,
        `User ${user.name} has left the group`
    )

    return res.status(200).json({
        success: true,
        message: "Member removed successfully"
    })
});

const sendAttachment = TryCatch(async (req, res, next) => {
    const { chatId } = req.body;

    const files = req.files || [];

    if(files.length < 1) return next(new ErrorHandler("Please upload attachments",400));
    if(files.length >5) 
      return next(new ErrorHandler("files can not be more than 5",400));

    const [chat, me] = await Promise.all(
        [
            Chat.findById(chatId),
            User.findById(req.user, "name")
        ]
    )

    if (!chat)
        return next(new ErrorHandler("Chat not found", 404));
    //upload
    const attachment = await uploadFilesToCloudinary(files);

    const messageForDb = { 
        content: "", 
        attachment, 
        sender: me._id, 
        chat: chatId 
    };

    const messageForRealTime = {
        ...messageForDb,
        sender: {
            _id: me._id,
            name: me.name
        },

    };


    const message = await Message.create(messageForDb);

    emitEvent(req,NEW_MESSAGE, chat.members, {
        message: messageForRealTime,
        chatId,
    });

    emitEvent(req, NEW_MESSAGE_ALERT, chat.members, { chatId });
    return res.status(200).json({
        success: true,
        message
    })
});

const getChatDetails = TryCatch(async (req, res, next) => {
    if (req.query.populate === 'true') {
        const chat = await Chat.findById(req.params.id).populate(
            "members", "name avatar"
        ).lean()

        if (!chat)
            return next(new ErrorHandler("Chat not found", 404));

        chat.members = chat.members.map(({ _id, name, avatar }
        ) => ({
            _id,
            name,
            avatar: avatar.url,
        }))
        return res.status(200).json({
            success: true,
            chat,
        })
    }
    else {
        const chat = await Chat.findById(req.params.id);
        if (!chat)
            return next(new ErrorHandler("chat is not found", 404));
        return res.status(200).json({
            success: true,
            chat,
        })
    }
});

const renameGroup = TryCatch(async (req, res, next) => {
    const chatId = req.params.id;
    const { name } = req.body;

    const chat = await Chat.findById(chatId);

    if (!chat) return next(new ErrorHandler("Chat not found", 404));
    if (!chat.groupchat)
        return next(new ErrorHandler("This is not group chat", 400));


    if (chat.creator.toString() !== req.user.toString()) {
        return next(
            new ErrorHandler("You are not allowed to rename the group", 403)
        )
    }
    console.count("here");
    chat.name = name;

    await chat.save();

    emitEvent(req, REFETCH_CHATS, chat.members);
    res.status(200).json({
        success: true,
        message: "Group Name updated",

    })
});

const deleteChat = TryCatch(async (req, res, next) => {
    const chatId = req.params.id;

    const chat = await Chat.findById(chatId);

    if (!chat) return next(new ErrorHandler("Chat not found", 404));

    const members = chat.members;

    if (chat.groupchat && chat.creator.toString() !== req.user.toString())
        return next(
            new ErrorHandler("You are not allowed to delete the group", 403)
        );

    if (!chat.groupchat && !chat.members.includes(req.user.toString())) {
        return next(
            new ErrorHandler("you are not allowed to delete the chat", 403)
        )
    }
    //delete attachment from cloudinary

    const messageWithAttachments = await Message.find({
        chat: chatId,
        attachments: { $exists: true, $ne: [] },
    })

    const public_ids = [];

    messageWithAttachments.forEach(({ attachment }) => {
        attachment.forEach(({ public_id }) => {
            public_ids.push(public_id);
        })
    })
    await Promise.all([
        deleteFilesFromCloudinary(public_ids),
        chat.deleteOne(),
        Message.deleteMany({ chat: chatId }),
    ])

    emitEvent(req, REFETCH_CHATS, chat.members); s
    res.status(200).json({
        success: true,
        message: "chat deleted successful",

    })

});

const getMessages = TryCatch(async (req, res, next) => {

    const chatId = req.params.id;

    const { page = 1 } = req.query;
    const resultPerPage = 20;
    const skip = (page - 1) * resultPerPage;

   const chat = await Chat.findById(chatId);
   
   if(!chat) return next(new ErrorHandler("Chat not Found",404));

   if(!chat.members.includes(req.user.toString())){
     return next(new ErrorHandler("you are not allowed to access this chat",404));
   }
    const [messages, totalMessagesCount] = await Promise.all([
        Message.find({ chat: chatId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(resultPerPage)
            .populate("sender", "name")
            .lean(),
        Message.countDocuments({ chat: chatId }),
    ]);

    const totalPages = Math.ceil(totalMessagesCount / resultPerPage);

    return res.status(200).json({
        success:true,
        message:messages.reverse(),
        totalPages,
    })
});

export {
    newGroup,
    getMyChats,
    getMyGroups,
    addMembers,
    removeMembers,
    leaveGroup,
    sendAttachment,
    getChatDetails,
    renameGroup,
    deleteChat,
    getMessages
};
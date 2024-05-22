import { TryCatch } from '../middleware/error.js';
import Chat from '../models/chat.js';
import User from '../models/users.js';
import Message from '../models/message.js';
import { ErrorHandler } from '../utils/utility.js';
import jwt from 'jsonwebtoken';
import { cookieOption } from '../utils/features.js';

const adminLogin = TryCatch((req, res, next) => {
    const { secretKey } = req.body;
    const adminSecretKey = process.env.ADMIN_SECRET_KEY || "SHADAB";
    const isMatch = secretKey === adminSecretKey;
    if (!isMatch) return next(new ErrorHandler("invalid admin key", 401));

    const token = jwt.sign(secretKey, process.env.JWT_SECRET);
    return res.status(200).cookie("admin-token", token, { ...cookieOption, maxAge: 1000 * 60 * 15 }).json({
        success: true,
        message: "Authenticated"
    });

});

const adminLogout = TryCatch((req,res)=>{

    return res.status(200).cookie("admin-token", "", { ...cookieOption, maxAge: 0 }).json({
        success: true,
        message: "Admin Logout successful"
    });    

})

const getAdminData= TryCatch((req,res)=>{
  return res.status(200).json({
    admin:true,
    
  })
})

const allUser = TryCatch(async (req, res) => {
    const users = await User.find({});
    const transformUser = await Promise.all(
        users.map(async ({ name, username, avatar, _id }) => {
            const [groups, friends] = await Promise.all([Chat.countDocuments
                ({ grouchat: true, members: _id }),
            Chat.countDocuments({ grouchat: false, members: _id })])
            return {
                name,
                username,
                avatar,
                _id,
                groups,
                friends,
            }
        })

    )
    return res.status(200).json({
        status: true,
        users: transformUser,
    })
})

const allChat = TryCatch(async (req, res) => {
    const chats = await Chat.find({}).populate("members", "name avatar");
    const transformedChats = await Promise.all(
        chats.map(async ({ members, _id, grouchat, name, creator }) => {
            const totalMessages = await Message.countDocuments({ chat: _id });
            return {
                _id,
                grouchat,
                name,
                creator,
                avatar: members.slice(0, 3).map((member) => member.avatar.url),
                members: members.map(({ _id, name, avatar }) => ({
                    _id,
                    name,
                    avatar: avatar.url,

                })),
                creator: {
                    name: creator?.name || "none",
                    avatar: creator.avatar.url || "",
                },
                totalMembers: members.length,
                totalMessages,
            }
        })
    )
    return res.status(200).json({
        status: true,
        transformedChats
    })
});

const allMessages = TryCatch(async (req, res) => {
    const messages = await Message.find({})
        .populate("sender", "name avatar")
        .populate("chat", "groupchat")
    const transformMessages = messages.map(({ content,
        attachment, _id, sender, createdAt, chat }) => ({
            _id,
            attachment,
            content,
            createdAt,
            chat: chat._id,
            groupchat: chat.grouchat,
            sender: {
                _id: sender._id,
                name: sender.name,
                avatar: sender.avatar.url,

            }
        }))
    return res.status(200).json({
        status: true,
        transformMessages,
    })
});

const getDashboardStats = TryCatch(async (req, res) => {
    const [groupsCount, userCounts, messageCount, totalCounts] =
        await Promise.all([
            Chat.countDocuments({ grouchat: true }),
            User.countDocuments(),
            Message.countDocuments(),
            Chat.countDocuments(),
        ]);

    const today = new Date();
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    const last7DaysMessages = await Message.find({
        createdAt: {
            $gte: last7Days,
            $lte: today,
        }
    }).select("createdAt");

    const messages = new Array(7).fill(0);
    const dayInMilliSconds = 1000 * 60 * 60 * 24;
    last7DaysMessages.forEach((message) => {
        const indexApprox =
            (today.getTime() - message.createdAt.getTime()) / dayInMilliSconds;
        const index = Math.floor(indexApprox);
        messages[6 - index]++;
    })
    const stats = {
        groupsCount,
        userCounts,
        messageCount,
        totalCounts,
        messages
    }
    return res.status(200).json({
        success: true,
        stats,
    })

});

export {
    allUser,
    allChat,
    allMessages,
    getDashboardStats,
    adminLogin,
    adminLogout,
    getAdminData
}
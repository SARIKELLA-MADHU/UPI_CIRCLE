// server/routes/api/circles.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/authMiddleware'); // Middleware to protect routes
const Circle = require('../../models/Circle'); // Import the Circle model
const User = require('../../models/user'); // Import the User model (ensure lowercase 'user' matches your filename)
const mongoose = require('mongoose'); // Needed for ObjectId validation potentially

// @route   POST /api/circles
// @desc    Create a new circle
// @access  Private (Requires token)
router.post('/', authMiddleware, async (req, res) => {
    // Get data from request body sent by the modal form
    const {
        name,
        description,
        requiredAmount, // Expecting number from frontend already parsed
        isAutoSplit,
        initialMembers // Array of invited UPI IDs (strings)
    } = req.body;
    const hostId = req.user.id; // Get the host's ID from the middleware

    // --- Input Validation ---
    if (!name || name.trim() === '') {
        return res.status(400).json({ msg: 'Circle name is required.' });
    }
    // Ensure requiredAmount is a non-negative number
    if (typeof requiredAmount !== 'number' || requiredAmount < 0) {
        return res.status(400).json({ msg: 'Valid Required Amount is required (0 or more).' });
    }
    // Ensure initialMembers is a non-empty array
    if (!initialMembers || !Array.isArray(initialMembers) || initialMembers.length === 0) {
        return res.status(400).json({ msg: 'Please add at least one member via UPI ID.' });
    }
    // Ensure boolean, default true
    const autoSplit = typeof isAutoSplit === 'boolean' ? isAutoSplit : true;
    // --- End Basic Validation ---

    try {
        // --- Validate Invited Member UPIs ---
        // Make sure UPIs are unique in the input list and lowercase for consistent check
        const uniqueInvitedUpiIds = [...new Set(initialMembers.map(upi => upi.trim().toLowerCase()))];

        // Find users matching the provided UPI IDs
        const foundMembers = await User.find({
            'upiId': { $in: uniqueInvitedUpiIds }
        }).select('_id upiId'); // Get ID and UPI to check

        // Check if all provided UPI IDs were found
        const foundUpiIds = foundMembers.map(m => m.upiId);
        const invalidUpiIds = uniqueInvitedUpiIds.filter(upi => !foundUpiIds.includes(upi));

        if (invalidUpiIds.length > 0) {
            // If any UPI ID doesn't belong to a registered user, reject the request
            return res.status(400).json({
                msg: `Could not find registered users for the following UPI IDs: ${invalidUpiIds.join(', ')}`
            });
        }
        // --- End Member Validation ---


        // --- Prepare Member List for New Circle ---
        // Start with the host
        const finalMemberList = [{
            userId: hostId,
            contribution: 0, // Starts at 0
            allocatedBalance: 0 // Starts at 0
        }];

        // Add the validated invited members (making sure not to add host twice if they were in the list)
        foundMembers.forEach(member => {
            // Check if this member is not the host before adding
            if (member._id.toString() !== hostId.toString()) {
                finalMemberList.push({
                    userId: member._id,
                    contribution: 0,
                    allocatedBalance: 0
                });
            }
        });
        // --- End Prepare Member List ---


        // --- Create and Save New Circle ---
        const newCircle = new Circle({
            name: name.trim(),
            description: description ? description.trim() : '',
            host: hostId,
            requiredAmount: requiredAmount, // Already validated as number
            isAutoSplit: autoSplit,
            poolBalance: 0, // Start with zero balance
            members: finalMemberList
        });

        const savedCircle = await newCircle.save();
        console.log(`Circle "${savedCircle.name}" created with ID: ${savedCircle._id}`);
        // --- End Create and Save New Circle ---


        // --- Update User Documents to include this circle ---
        // Get all unique user IDs from the final member list
        const allMemberIds = finalMemberList.map(m => m.userId);
        await User.updateMany(
            { '_id': { $in: allMemberIds } }, // Find users by their IDs
            { $addToSet: { circles: savedCircle._id } } // Add circle ID to their 'circles' array
        );
        console.log(`Updated 'circles' array for ${allMemberIds.length} users.`);
        // --- End Update User Documents ---


        // Send the successfully created circle data back to the frontend
        res.status(201).json(savedCircle);

    } catch (err) {
        console.error("Create Circle API Error:", err); // Log the full error
        res.status(500).send('Server Error while creating circle.');
    }
});

// --- Add other circle routes later (GET /, POST /:id/contribute, etc.) ---
// server/routes/api/circles.js
// ... (keep existing requires: express, router, authMiddleware, Circle, User) ...
// ... (keep existing POST / route handler) ...

// --- ADD THIS ROUTE ---
// @route   GET /api/circles
// @desc    Get all circles the logged-in user is a member of
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id; // Get user ID from verified token

        // Find circles where the members array contains an element with the user's ID
        const circles = await Circle.find({ 'members.userId': userId })
            .sort({ createdAt: -1 }) // Sort by newest first
            // Optionally populate host details if needed later: .populate('host', 'name email')
            .select('-__v'); // Exclude version key

        res.json(circles); // Send the array of circles back

    } catch (err) {
        console.error("Get Circles Error:", err.message);
        res.status(500).send('Server Error');
    }
});
// --- END OF ADDED ROUTE ---
// server/routes/api/circles.js
// ... (keep existing requires: express, router, authMiddleware, Circle, User) ...
// ... (keep existing POST / route handler) ...
// ... (keep existing GET / route handler) ...

// --- ADD THIS ROUTE ---
// @route   GET /api/circles/:circleId
// @desc    Get details of a specific circle
// @access  Private (User must be member)
router.get('/:circleId', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const circleId = req.params.circleId;

        // Validate if circleId is a valid ObjectId format
        if (!mongoose.Types.ObjectId.isValid(circleId)) {
            return res.status(400).json({ msg: 'Invalid Circle ID format.' });
        }

        // Find the circle by its ID
        // Populate 'host' with user's name
        // Populate 'members.userId' with user's name, email, and upiId
        const circle = await Circle.findById(circleId)
            .populate('host', 'name') // Get host's name
            .populate('members.userId', 'name email upiId'); // Get details for each member

        // Check if the circle exists
        if (!circle) {
            return res.status(404).json({ msg: 'Circle not found.' });
        }

        // Check if the logged-in user is actually a member of this circle
        const isMember = circle.members.some(member => member.userId && member.userId._id.toString() === userId);
        if (!isMember) {
            // If not a member, deny access
            return res.status(403).json({ msg: 'User not authorized to view this circle.' });
        }

        // If circle found and user is a member, send the circle data
        res.json(circle);

    } catch (err) {
        console.error("Get Circle Detail Error:", err.message);
        // Handle potential CastError if ID format is wrong but technically valid syntax
         if (err.kind === 'ObjectId') {
             return res.status(404).json({ msg: 'Circle not found (cast error).' });
        }
        res.status(500).send('Server Error');
    }
});
// --- END OF ADDED ROUTE ---
// server/routes/api/circles.js
// ... (keep existing requires: express, router, authMiddleware, Circle, User, mongoose) ...
// ... (keep existing POST / and GET /:circleId routes) ...

// --- ADD THIS ROUTE ---
// @route   POST /api/circles/:circleId/contribute
// @desc    Initiate a group contribution (Auto-Split ON) or individual (Auto-Split OFF - TBC)
// @access  Private (User must be member)
router.post('/:circleId/contribute', authMiddleware, async (req, res) => {
    const { amount } = req.body; // This is the TOTAL amount for the group contribution
    const circleId = req.params.circleId;
    const initiatorUserId = req.user.id; // User initiating the contribution

    // --- Validation ---
    const totalContributionAmount = parseFloat(amount);
    if (isNaN(totalContributionAmount) || totalContributionAmount <= 0) {
        return res.status(400).json({ msg: 'Please provide a valid positive total contribution amount.' });
    }
    if (!mongoose.Types.ObjectId.isValid(circleId)) {
        return res.status(400).json({ msg: 'Invalid Circle ID format.' });
    }
    // --- End Validation ---

    try {
        // --- Get Circle and Check Membership/Mode ---
        const circle = await Circle.findById(circleId);
        if (!circle) { return res.status(404).json({ msg: 'Circle not found.' }); }

        const isMember = circle.members.some(m => m.userId.toString() === initiatorUserId);
        if (!isMember) { return res.status(403).json({ msg: 'User not authorized for this circle.' }); }

        // --- Logic based on Auto-Split Mode ---
        if (circle.isAutoSplit) {
            // === Auto-Split ON: Group Deduction Logic ===

            const members = circle.members;
            const memberCount = members.length;
            if (memberCount === 0) { return res.status(400).json({ msg: 'Cannot contribute to a circle with no members.' }); }

            const sharePerMember = totalContributionAmount / memberCount;

            // --- Check ALL member balances BEFORE deducting ---
            const memberUserIds = members.map(m => m.userId);
            const memberUsers = await User.find({ '_id': { $in: memberUserIds } }).select('_id balance name');

            if (memberUsers.length !== memberCount) {
                 console.error(`Mismatch fetching members for balance check. Expected ${memberCount}, got ${memberUsers.length}`);
                 return res.status(500).json({ msg: 'Error checking member balances.' });
            }

            const insufficientMembers = [];
            for (const user of memberUsers) {
                if (user.balance < sharePerMember) {
                    insufficientMembers.push(user.name || user._id); // Collect names/IDs of members with low balance
                }
            }

            // If any member has insufficient funds, FAIL the entire operation
            if (insufficientMembers.length > 0) {
                return res.status(400).json({
                    msg: `Contribution failed. Insufficient balance for: <span class="math-inline">\{insufficientMembers\.join\(', '\)\}\. Required share\: ₹</span>{sharePerMember.toFixed(2)} each.`
                });
            }
            // --- End Balance Check ---


            // --- Perform Deductions & Updates (Attempt non-transactional) ---
            // WARNING: Without transactions, if one update fails mid-way, data could be inconsistent.
            // 1. Deduct from each user's balance
            const deductionPromises = memberUserIds.map(id =>
                User.findByIdAndUpdate(id, { $inc: { balance: -sharePerMember } })
            );
            await Promise.all(deductionPromises); // Hope these all succeed...
            console.log(`Deducted ${sharePerMember.toFixed(2)} from ${memberCount} users.`);

            // 2. Update Circle pool balance and member contributions/allocated balances
            const updatedCircle = await Circle.findByIdAndUpdate(
                circleId,
                {
                    $inc: { // Increment pool balance
                        poolBalance: totalContributionAmount
                    },
                    // Increment contribution for each member within the members array
                    $incAll: { 'members.$[].contribution': sharePerMember } // Note: $incAll might not work directly like this, may need loop/complex update
                },
                { new: true } // Return updated document
            ).populate('members.userId', 'name email upiId'); // Repopulate needed data

            // WORKAROUND for $incAll not being standard - Loop update (less efficient)
            // This section replaces the $incAll above if it causes issues
             circle.poolBalance += totalContributionAmount; // Update pool balance directly first
             circle.members.forEach(member => {
                 member.contribution += sharePerMember; // Update individual contribution
             });

            // 3. Recalculate and SET allocatedBalance based on NEW free money
            const freeMoney = Math.max(0, circle.poolBalance - circle.requiredAmount);
            const freeShare = memberCount > 0 ? freeMoney / memberCount : 0;
            circle.members.forEach(member => {
                member.allocatedBalance = freeShare; // SET (overwrite) allocated balance based on new free money
            });

            // 4. Save all circle changes together
            await circle.save();

            console.log(`Circle ${circleId} updated. New Pool Balance: ${circle.poolBalance}`);
            res.json({
                 msg: `Group contribution of ₹<span class="math-inline">\{totalContributionAmount\.toFixed\(2\)\} successful\. Each member contributed ₹</span>{sharePerMember.toFixed(2)}.`,
                 circle: circle // Send back updated circle data
            });
            // === End Auto-Split ON Logic ===

        } else {
            // === Auto-Split OFF: Individual Contribution Logic (Host likely adds via separate mechanism) ===
            // Let's assume members *can* still contribute individually if they want,
            // but it doesn't affect others' allocated balances.
            const initiatorUser = await User.findById(initiatorUserId);
            if (!initiatorUser || initiatorUser.balance < totalContributionAmount) {
                 return res.status(400).json({ msg: 'Insufficient personal balance for this contribution.' });
            }

            // Deduct from initiator
            initiatorUser.balance -= totalContributionAmount;
            await initiatorUser.save();

            // Find member entry within circle to update their contribution
            const memberIndex = circle.members.findIndex(m => m.userId.toString() === initiatorUserId);

            // Update Circle (pool balance and initiator's contribution)
            const updateQuery = { $inc: { poolBalance: totalContributionAmount } };
            if (memberIndex !== -1) {
                updateQuery.$inc[`members.${memberIndex}.contribution`] = totalContributionAmount;
            } else {
                 console.warn(`Could not find member entry for initiator ${initiatorUserId} in circle ${circleId} members array during contribution.`);
            }

            const updatedCircle = await Circle.findByIdAndUpdate(circleId, updateQuery, { new: true })
                                            .populate('members.userId', 'name email upiId');

             res.json({
                 msg: `Individual contribution of ₹${totalContributionAmount.toFixed(2)} successful.`,
                 circle: updatedCircle
             });
            // === End Auto-Split OFF Logic ===
        }

    } catch (err) {
        console.error("Contribute Route Error:", err);
        // TODO: Add rollback logic here if possible/needed, especially for user balance deductions
        res.status(500).send('Server Error during contribution.');
    }
});
// server/routes/api/circles.js
// ... (keep existing requires and other routes) ...

// --- ADD THIS SET ALLOCATION LIMIT ROUTE ---
// @route   POST /api/circles/:circleId/setAllocationLimit
// @desc    Host sets a total limit amount to be allocated equally among members
// @access  Private (Host only)
router.post('/:circleId/setAllocationLimit', authMiddleware, async (req, res) => {
    const { allocationLimitAmount } = req.body; // Total amount host wants to allocate from pool
    const { circleId } = req.params;
    const hostUserId = req.user.id;

    // --- Validation ---
    const limitAmount = parseFloat(allocationLimitAmount);
    if (isNaN(limitAmount) || limitAmount <= 0) {
        return res.status(400).json({ msg: 'Please provide a valid positive amount to allocate.' });
    }
    if (!mongoose.Types.ObjectId.isValid(circleId)) {
        return res.status(400).json({ msg: 'Invalid Circle ID format.' });
    }
    // --- End Validation ---

    try {
        // --- Find Circle and Authorize ---
        const circle = await Circle.findById(circleId);
        if (!circle) { return res.status(404).json({ msg: 'Circle not found.' }); }

        // 1. Check if logged-in user is the HOST
        if (circle.host.toString() !== hostUserId) {
            return res.status(403).json({ msg: 'Only the host can set allocation limits.' });
        }

        // 2. Check if pool has sufficient balance
        if (circle.poolBalance < limitAmount) {
            return res.status(400).json({ msg: `Insufficient pool balance. Available: ₹${circle.poolBalance.toFixed(2)}` });
        }

        // 3. Calculate share per member
        const memberCount = circle.members.length;
        if (memberCount === 0) { return res.status(400).json({ msg: 'Cannot allocate in a circle with no members.' }); }
        const sharePerMember = limitAmount / memberCount;
        // --- End Authorization and Checks ---

        // --- Perform Updates ---
        // Decrease pool balance
        circle.poolBalance -= limitAmount;

        // Increase each member's allocated balance by the share amount
        circle.members.forEach(member => {
            // Use $inc logic equivalent by adding to existing value
            member.allocatedBalance = (member.allocatedBalance || 0) + sharePerMember;
        });

        // Save the updated circle document
        const updatedCircle = await circle.save();
        // --- End Updates ---

        // Repopulate for response
         const populatedCircle = await Circle.findById(updatedCircle._id)
                                          .populate('host', 'name')
                                          .populate('members.userId', 'name email upiId');

        console.log(`Host ${hostUserId} allocated total ${limitAmount} (share: ${sharePerMember}) in circle ${circleId}. New pool balance: ${populatedCircle.poolBalance}`);
        res.json({
            msg: `Successfully allocated ₹${sharePerMember.toFixed(2)} to each of the ${memberCount} members.`,
            circle: populatedCircle // Send back updated circle
        });

    } catch (err) {
        console.error("Set Allocation Limit Error:", err);
        res.status(500).send('Server Error during allocation limit setting.');
    }
});
// server/routes/api/circles.js
// ... requires ...

// @route   POST /api/circles/:circleId/setAllocationLimit
// @desc    Host sets a total limit amount to be allocated equally (Auto-Split ON mode)
// @access  Private (Host only)
router.post('/:circleId/setAllocationLimit', authMiddleware, async (req, res) => {
    const { allocationLimitAmount } = req.body;
    const { circleId } = req.params;
    const hostUserId = req.user.id;

    // --- Validation ---
    const limitAmount = parseFloat(allocationLimitAmount);
    if (isNaN(limitAmount) || limitAmount <= 0) { /* ... validation ... */ }
    if (!mongoose.Types.ObjectId.isValid(circleId)) { /* ... validation ... */ }

    try {
        const circle = await Circle.findById(circleId);
        if (!circle) { /* ... not found ... */ }

        // 1. Check if logged-in user is the HOST
        if (circle.host.toString() !== hostUserId) {
            return res.status(403).json({ msg: 'Only the host can set allocation limits.' });
        }

        // --- ADD THIS CHECK ---
        // 2. Check if circle is in AUTO-SPLIT mode for THIS action
        if (!circle.isAutoSplit) {
            return res.status(400).json({ msg: 'Equal distribution is only available when Auto-Split is ON. Use Manual Allocation instead.' });
        }
        // --- END OF ADDED CHECK ---

        // 3. Check if pool has sufficient balance
        if (circle.poolBalance < limitAmount) { /* ... insufficient balance ... */ }

        // 4. Calculate share per member
        const memberCount = circle.members.length;
        if (memberCount === 0) { /* ... no members ... */ }
        const sharePerMember = limitAmount / memberCount;

        // --- Perform Updates ---
        circle.poolBalance -= limitAmount;
        circle.members.forEach(member => {
            member.allocatedBalance = (member.allocatedBalance || 0) + sharePerMember;
        });
        const updatedCircle = await circle.save();
        // --- End Updates ---

        // Repopulate and return success
         const populatedCircle = await Circle.findById(updatedCircle._id).populate(/* ... */); // Populate as needed
         console.log(`Host ${hostUserId} set limit ${limitAmount}...`); // Update log
         res.json({ msg: `Successfully allocated ₹${sharePerMember.toFixed(2)} to each of ${memberCount} members.`, circle: populatedCircle });

    } catch (err) { /* ... error handling ... */ }
});
// server/routes/api/circles.js
// ... requires ...
// ... other routes (POST /, GET /, GET /:id, POST /:id/contribute, POST /:id/setAllocationLimit) ...
// --- ADD THIS NEW ROUTE ---
// @route   POST /api/circles/:circleId/allocateManual
// @desc    Host manually allocates funds from pool to ONE member (Manual mode)
// @access  Private (Host only)
router.post('/:circleId/allocateManual', authMiddleware, async (req, res) => {
    // Expect target member's USER ID and the specific amount
    const { targetMemberUserId, amount } = req.body;
    const { circleId } = req.params;
    const hostUserId = req.user.id;

    // --- Validation ---
    const allocationAmount = parseFloat(amount);
    if (!targetMemberUserId || !mongoose.Types.ObjectId.isValid(targetMemberUserId)) {
         return res.status(400).json({ msg: 'Valid target member User ID is required.' });
     }
    if (isNaN(allocationAmount) || allocationAmount <= 0) {
        return res.status(400).json({ msg: 'Please provide a valid positive amount to allocate.' });
    }
    if (!mongoose.Types.ObjectId.isValid(circleId)) {
        return res.status(400).json({ msg: 'Invalid Circle ID format.' });
    }
    // --- End Validation ---

    try {
        // --- Find Circle and Authorize ---
        const circle = await Circle.findById(circleId);
        if (!circle) { return res.status(404).json({ msg: 'Circle not found.' }); }

        // 1. Check if logged-in user is the HOST
        if (circle.host.toString() !== hostUserId) {
            return res.status(403).json({ msg: 'Only the host can allocate funds.' });
        }
        // 2. Check if circle is in MANUAL mode
        if (circle.isAutoSplit) { // Note: check if TRUE
            return res.status(400).json({ msg: 'Manual allocation is only available when Auto-Split is OFF.' });
        }
        // 3. Find the target member within the circle's members array
        const targetMemberIndex = circle.members.findIndex(m => m.userId.toString() === targetMemberUserId);
        if (targetMemberIndex === -1) {
            return res.status(404).json({ msg: 'Target user is not a member of this circle.' });
        }
        // Optional: Prevent allocating to self?
        // if (targetMemberUserId === hostUserId) { return res.status(400).json({ msg: 'Host cannot manually allocate funds to themselves this way.'});}

        // 4. Check if pool has sufficient balance
        if (circle.poolBalance < allocationAmount) {
            return res.status(400).json({ msg: `Insufficient pool balance. Available: ₹${circle.poolBalance.toFixed(2)}` });
        }
        // --- End Authorization and Checks ---

        // --- Perform Updates ---
        // Decrease pool balance
        circle.poolBalance -= allocationAmount;
        // Increase *only* the target member's allocated balance
        circle.members[targetMemberIndex].allocatedBalance =
            (circle.members[targetMemberIndex].allocatedBalance || 0) + allocationAmount;

        // Save the updated circle document
        await circle.save();
        // --- End Updates ---

         // Repopulate for response
         const populatedCircle = await Circle.findById(circle._id)
                                          .populate('host', 'name')
                                          .populate('members.userId', 'name email upiId'); // Populate necessary fields


         // Find the target member's name for the message
         const targetMemberName = populatedCircle.members[targetMemberIndex]?.userId?.name || 'the member';

         console.log(`Host ${hostUserId} manually allocated ${allocationAmount} to member <span class="math-inline">\{targetMemberUserId\} \(</span>{targetMemberName}) in circle ${circleId}. New pool balance: ${populatedCircle.poolBalance}`);
         res.json({
             msg: `Successfully allocated ₹${allocationAmount.toFixed(2)} to ${targetMemberName}.`,
             circle: populatedCircle // Send back updated circle
         });

    } catch (err) {
         console.error("Manual Allocate Error:", err);
         res.status(500).send('Server Error during manual allocation.');
    }
});
// server/routes/api/circles.js
// ... other imports (express, router, authMiddleware, Circle, User, mongoose) ...

// ... other routes (POST /, GET /, GET /:id, POST /:id/contribute, etc.) ...


// --- ADD THIS ROUTE ---
// @route   POST /api/circles/join/:circleId
// @desc    Allow logged-in user to join an existing circle
// @access  Private
router.post('/join/:circleId', authMiddleware, async (req, res) => {
    const userId = req.user.id; // User wanting to join
    const { circleId } = req.params; // Circle they want to join

    // 1. Validate Circle ID format
    if (!mongoose.Types.ObjectId.isValid(circleId)) {
        return res.status(400).json({ msg: 'Invalid Circle ID format.' });
    }

    try {
        // 2. Find the circle
        const circle = await Circle.findById(circleId);
        if (!circle) {
            return res.status(404).json({ msg: 'Circle not found.' });
        }

        // 3. Check if user is already a member
        const isAlreadyMember = circle.members.some(member => member.userId.toString() === userId);
        if (isAlreadyMember) {
            return res.status(400).json({ msg: 'You are already a member of this circle.' });
        }

        // 4. Add user to the circle's members list
        const newMember = {
            userId: userId,
            contribution: 0, // Start with 0
            allocatedBalance: 0 // Start with 0
        };

        // Use $addToSet to add the new member object - ensures uniqueness if somehow checked twice
        const updatedCircle = await Circle.findByIdAndUpdate(
            circleId,
            { $addToSet: { members: newMember } },
            { new: true } // Return the updated document
        ).populate('host', 'name').populate('members.userId', 'name email upiId'); // Repopulate for potentially sending back updated data

        if (!updatedCircle) {
             // Should not happen if findById worked, but good check
             throw new Error('Failed to update circle after finding it.');
        }

        // 5. (Optional but Recommended) Add circle to user's document
        //    Requires 'circles: [Schema.Types.ObjectId]' array in User schema
         try {
             await User.findByIdAndUpdate(userId, { $addToSet: { circles: circleId } });
             console.log(`Added circle ${circleId} to user ${userId}'s list.`);
         } catch (userUpdateError) {
             console.error(`Failed to add circle ${circleId} to user ${userId}'s list:`, userUpdateError);
             // Continue even if this fails, joining the circle is primary
         }


        res.json({ msg: 'Successfully joined the circle!', circle: updatedCircle });

    } catch (err) {
        console.error("Join Circle API Error:", err);
        res.status(500).send('Server Error while trying to join circle.');
    }
});
// --- END OF ADDED ROUTE ---
// Ensure this is at the very end
// --- END OF NEW ROUTE ---
 // Keep only ONE export at the end
// --- END OF ADDED ROUTE ---
// ... Keep GET /:circleId route ...
// ... Keep POST / route ...
// ... Add POST /:circleId/allocate route later ...
// ... Add POST /:circleId/members route later ...
// --- We will add POST /:circleId/members and POST /:circleId/contribute later ---
module.exports = router; // Ensure only one export at the end
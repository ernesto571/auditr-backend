import { getAuthSession } from "../config/auth.js";
import { sql } from "../config/db.js";

export const getAllReports = async(req, res) => {
    try {
        const session = await getAuthSession(req.headers);
        const userId = session.user.id;

        const reports = await sql`
            SELECT * FROM reports
            WHERE auth_id = ${userId}
            ORDER BY created_at DESC
        `;
        return res.status(200).json({ reports });

    } catch (error) {
        console.error("Fetch report error:", error);
        return res.status(500).json({ message: "Could not fetch report" });
    }
}

export const saveReport = async (req, res) => {
    const { id } = req.params;
   
    try{
      const savedReport = await sql`
        UPDATE reports
          SET saved=true
          WHERE id=${id}
          RETURNING *
        `;
  
        res.status(200).json({ success: true, data: savedReport[0] });
    } catch (error) {
      console.log("Error in saveReport function", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  }
  
export const removeFromSavedReport = async (req, res) => {
    const { id } = req.params;

    try{
        const removedReport = await sql`
        UPDATE reports
            SET saved=false
            WHERE id=${id}
            RETURNING *
        `;

        res.status(200).json({ success: true, data: removedReport[0] });
    } catch (error) {
        console.log("Error in removeFromSavedReport function", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export const getSavedReports = async (req, res) => {

    try {
        const session = await getAuthSession(req.headers);
        const userId = session.user.id;
        const savedReports = await sql `
            SELECT * FROM reports
            WHERE auth_id=${userId} AND saved=true
            ORDER BY updated_at DESC
        `

        return res.status(200).json({ savedReports });

    } catch (error) {
        console.log("Error in getSavedReports function", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}
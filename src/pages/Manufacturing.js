import React, {useContext, useEffect, useState} from 'react';
import {Typography, Descriptions, Button, Table, DatePicker, Space, Input, Modal, Spin} from 'antd';
import classNames from "classnames";
import {LeftOutlined, RightOutlined, LinkOutlined} from "@ant-design/icons";
import { makeStyles } from "@material-ui/core/styles";
import {fetchManufacturingStatus, fetchTagResultData, fetchTagHistory, fetchTagStats} from "../db_service/service";
import { TinyLine, Line, DualAxes } from '@ant-design/plots';
import Moment from 'moment';


const styles = (theme) => ({

});


const useStyles = makeStyles(styles);

const Manufacturing = (props) => {
    const classes = useStyles(props);

    let start = new Moment().subtract(1, 'days');
    let end = new Moment();

    let [products, setProducts] = useState([]);
    let [result, setResult] = useState([])

    useEffect(()=>{
        fetchManufacturingStatus().then(res=>{
            setProducts(res.data.rows);
            fetchResults(res.data.rows);
        })
    }, []);

    useEffect(()=>{
        // let interval = setInterval(()=>{
        //     setProducts(prevProducts=>{
        //         fetchResults(prevProducts);
        //         return prevProducts
        //     })
        // }, 5000)
        // return () => clearInterval(interval);
    }, [])

    const fetchResults = async (products) => {
        let tagsMap = products.reduce((r, e)=>{
            if(r.hasOwnProperty(e.DB_NAME)){
                r[e.DB_NAME].push(e.TAG_INDEX)
            }else{
                r[e.DB_NAME] = [e.TAG_INDEX]
            }
            return r
        }, {})
        let productTagMap = products.reduce((r, e)=>{
            if(!r.hasOwnProperty(e.PO_NUMBER_S)){
                r[e.PO_NUMBER_S] = {};
            }
            if(!r[e.PO_NUMBER_S].hasOwnProperty(e.LINE_DETAIL_S)){
                r[e.PO_NUMBER_S][e.LINE_DETAIL_S] = []
            }
            r[e.PO_NUMBER_S][e.LINE_DETAIL_S].push(e.DB_NAME + '/' + e.TAG_INDEX)
            return r
        }, {})
        let entries = Object.entries(tagsMap)
        let tagValues = {};
        for(let i=0; i < entries.length; i++){
            let [dbName, tags] = entries[i];
            let res = await fetchTagResultData(dbName, tags);
            res.data.rows.forEach(e=>{
                let key = dbName + '/' + e.TagIndex
                if(!tagValues.hasOwnProperty(key)){
                    tagValues[key] = e.Val
                }
            })
        }
        let unique = {}
        products.forEach(e=>{
            unique[e.PO_NUMBER_S] = e
        })
        let result = Object.entries(unique).map(([poNumber, e])=>{
            let lines = productTagMap[poNumber] || []
            e.innerValue = 0
            e.outerValue = 0
            Object.entries(lines).forEach(([type, tags])=>{
                if(type.endsWith('OUTER')){
                    e.outerValue += tags.reduce((r, e)=>tagValues[e] || r, 0)
                }else{
                    e.innerValue += tags.reduce((r, e)=>r + tagValues[e] || r, 0)
                }
            })
            return e
        })
        setResult(result)
    }

    return (
        <div>
            <div>품명 / 목표생산 / UOM / MRP / 내포장실적 / 외포장실적</div>
            <br/>
            {result.map((e, i)=>{
                return (
                    <div style={{marginBottom: 10}} key={i}>
                        {e['PART_NAME']} / {e['PLANNED']} / {e['UOM']} / {e['MRP']} / {e['innerValue']} / {e['outerValue']}
                    </div>
                )
            })}
        </div>
    );
};

export default Manufacturing;


